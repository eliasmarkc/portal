function ApplicationFormCtrl($scope, $rootScope, $localStorage, $location, $anchorScroll, $translate, Apps, Jobs, Systems, $mdToast, Django, ProjectService) {
      'nginject';
      $localStorage.systemChecks = {};

      $scope.data = {
        messages: [],
        submitting: false,
        needsLicense: false,
        unavailable: false,
        systemDown: false,
        app: null,
        form: {}
      };

      Jobs.getWebhookUrl().then(function(response) {
        $scope.webhookUrl = response.data;
      });

      $scope.$on('launch-app', function(e, app) {
        $scope.error = '';

        if ($scope.data.app) {
          $rootScope.$broadcast('close-app', $scope.data.app.id);
        }

          if (app.value.type === 'agave'){
            $scope.data.type = app.value.type;
            Apps.get(app.value.definition.id).then(function(resp) {

              $scope.data.app = resp.data;
                
              Systems.getSystemStatus(resp.data.executionSystem).then(function(response) {
                var heartbeatStatus = response.data.heartbeat.status;
                $scope.data.systemDown = (heartbeatStatus == false);
                $scope.resetForm();
              });
            });
          } else if (app.value.type === 'html') {
            $scope.data.type = app.value.type;
            $scope.data.app = app.value.definition.html;
          }
      });

      $scope.resetForm = function() {
        $scope.data.needsLicense = $scope.data.app.license.type && !$scope.data.app.license.enabled;
        $scope.data.unavailable = ($scope.data.app.executionSystem == "designsafe.community.exec.stampede" || $scope.data.app.executionSystem == "designsafe.community.exec.stampede.nores");
        $scope.form = { model: {}, readonly: ($scope.data.needsLicense || $scope.data.unavailable)};
        $scope.form.schema = Apps.formSchema($scope.data.app);
        $scope.form.form = [];
        //reset formValid, var is used for invalid form msg
        $scope.data.formValid = [];

        /* inputs */
        var items = [];
        if ($scope.form.schema.properties.inputs) {
          items.push('inputs');
        }
        if ($scope.form.schema.properties.parameters) {
          items.push('parameters');
        }
        $scope.form.form.push({
          type: 'fieldset',
          readonly: ($scope.data.needsLicense || $scope.data.unavailable || $scope.data.systemDown),
          title: 'Inputs',
          items: items
        });

        /* job details */
        items = [];
        if ($scope.data.app.tags.includes('Interactive')) {
          items.push('name');
        } else {
          items.push('maxRunTime', 'name', 'archivePath');
        }
        if ($scope.data.app.parallelism == 'PARALLEL' && !$scope.data.app.tags.includes('hideNodeCount')) {
          items.push('nodeCount');
        }
        $scope.form.form.push({
          type: 'fieldset',
          readonly: ($scope.data.needsLicense || $scope.data.unavailable || $scope.data.systemDown),
          title: 'Job details',
          items: items
        });

        /* buttons */
        items = [];
        if (!($scope.data.needsLicense || $scope.data.unavailable || $scope.data.systemDown)) {
          items.push({type: 'submit', title: ($scope.data.app.tags.includes('Interactive') ? 'Launch' : 'Run'), style: 'btn-primary'});
        }
        items.push({type: 'button', title: 'Close', style: 'btn-link', onClick: 'closeApp()'});
        $scope.form.form.push({
          type: 'actions',
          items: items
        });
      };

      $scope.onSubmit = function(form) {
        $scope.data.messages = [];
        $scope.$broadcast('schemaFormValidate');
        if (form.$valid) {
          //set formValid to true, var is used for invalid error msg
          $scope.data.formValid = true;
          var jobData = {
            appId: $scope.data.app.id,
            archive: true,
            inputs: {},
            parameters: {},
            notifications: ['PENDING', 'QUEUED', 'SUBMITTING', 'PROCESSING_INPUTS', 'STAGED', 'KILLED', 'FAILED', 'STOPPED', 'FINISHED'].map(
              e => ({
                url: $scope.webhookUrl,
                event: e
              })
            )
          };

          /* copy form model to disconnect from $scope */
          _.extend(jobData, angular.copy($scope.form.model));

          /* remove falsy input/parameter */
          _.each(jobData.inputs, function(v,k) {
            if (_.isArray(v)) {
              v = _.compact(v);
              if (v.length === 0) {
                delete jobData.inputs[k];
              }
            }
          });
          _.each(jobData.parameters, function(v,k) {
            if (_.isArray(v)) {
              v = _.compact(v);
              if (v.length === 0) {
                delete jobData.parameters[k];
              }
            }
          });

          // Calculate processorsPerNode if nodeCount parameter submitted
          if (_.has(jobData, 'nodeCount')) {
            jobData.processorsPerNode = jobData.nodeCount * ($scope.data.app.defaultProcessorsPerNode / $scope.data.app.defaultNodeCount);
          }

          $scope.jobReady = true;
          if ($scope.data.app.tags.includes('VNC')) {
            $scope.jobReady = false;
            ProjectService.list({ offset: 0, limit: 500 }).then(function (resp) {
              if (resp.length > 0) {
                angular.forEach(resp, function (project, key) {
                  resp[key] = `${project.uuid},${project.value.projectId}`;
                });
                jobData.parameters._userProjects = resp;
              }
              $scope.jobReady = true;
            });
          }

          $scope.data.submitting = true;

          // wait for projects listing to return
          var unregister = $scope.$watch('jobReady', function(readyStatus) {
            if (readyStatus) {
              Jobs.submit(jobData).then(
                function(resp) {
                  $scope.data.submitting = false;
                  $rootScope.$broadcast('job-submitted', resp.data);
                  $scope.data.messages.push({
                    type: 'success',
                    header: 'Job Submitted Successfully',
                    body: 'Your job <em>' + resp.data.name + '</em> has been submitted. Monitor its status on the right.'
                  });
                  $scope.resetForm();
                  refocus();
                }, function(err) {
                  $scope.data.submitting = false;
                  $scope.data.messages.push({
                    type: 'danger',
                    header: 'Job Submit Failed',
                    body: 'Your job submission failed with the following message:<br>' +
                    '<em>' + (err.data.message || 'Unexpected error') + '</em><br>' +
                    'Please try again. If this problem persists, please ' +
                    '<a href="/help" target="_blank">submit a support ticket</a>.'
                  });
                  refocus();
                });
              unregister();
            }
          });
          
        }
        else {
          // set a variable so we can show an error message when form is not valid
          $scope.data.formValid = false;
        }
      };

      $scope.onLaunchNotebook = function(path, jupyter_base_url='https://jupyter.designsafe-ci.org', copy=true) {
        let file_path = path.split(/\/(.+)/)[1];
        let file_mgr_name = 'community'; // path.split('/')[0];
        let system_id = 'designsafe.storage.community';

        $scope.data.launching = true;
        if (copy) {
          Apps.copyNotebook(file_mgr_name, system_id, file_path)
            .then(function (resp) {
              $scope.data.launching = false;
              window.open(`${jupyter_base_url}/user/${Django.user}/notebooks/mydata/${resp.data.name}`, '').focus();
            }, function (err) {
              $scope.data.launching = false;
            });
        } else {
          // create dir of parent folder in user's mydata
          Apps.setupNotebook(file_path.split('/').slice(-2, -1)[0])
            .then(function (resp) {
              $scope.data.launching = false;
              window.open(`${jupyter_base_url}/user/${Django.user}/notebooks/${path}`, '').focus();
            }, function (err) {
              $scope.data.launching = false;
            });
        }
        
      };

      function refocus() {
        $location.hash('workspace');
        $anchorScroll();
      }

      function closeApp() {
        $scope.data.app = null;
        $scope.data.appLicenseEnabled = false;
      }

      $scope.$on('close-app', closeApp);

      $scope.closeApp = function() {
        $rootScope.$broadcast('close-app', $scope.data.app.id);
        closeApp();
      };
    }

export default ApplicationFormCtrl