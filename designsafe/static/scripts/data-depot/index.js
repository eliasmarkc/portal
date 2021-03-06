import angular from 'angular';

import './../ng-designsafe/providers';
import './components';
import './services';

let ddModule = angular.module('ds-data', ['designsafe', 'dd.components', 'dd.services']);
ddModule.requires.push(
    'ui.router',
    'djng.urls', //TODO: djng
    'ui.bootstrap',
    'django.context',
    'ds.notifications',
    'ds.wsBus',
    'toastr',
    'logging',
    'ui.customSelect',
    'ngSanitize'
);
angular.module('designsafe.portal').requires.push('ds-data');

/**
 * @function
 * @param {Object} $httpProvider
 * @param {Object} $locationProvider 
 * @param {Object} $stateProvider
 * @param {Object} $urlRouterProvider
 * @param {Object} Django
 * @param {Object} toastrConfig
 */
function config(
    $httpProvider,
    $locationProvider,
    $stateProvider,
    $urlRouterProvider,
    $urlMatcherFactoryProvider,
    Django,
    toastrConfig
) {
    'ngInject';

    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
    $locationProvider.html5Mode(true);
    $urlMatcherFactoryProvider.strictMode(false);

    angular.extend(toastrConfig, {
        positionClass: 'toast-bottom-left',
        timeOut: 20000,
    });

    $stateProvider
        /* Private */
        .state('myData', {
            url: '/agave/{systemId}/{filePath:any}/',
            component: 'dataDepotBrowser',
            params: {
                systemId: 'designsafe.storage.default',
                filePath: Django.user,
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'agave',
                        baseUrl: '/api/agave/files',
                        searchState: 'dataSearch',
                    };
                },
                path: ($stateParams, Django) => {
                    'ngInject';
                    if ($stateParams.filePath === '/') {
                        return Django.user;
                    }
                    return $stateParams.filePath;
                },
                auth: ($q, Django) => {
                    'ngInject';
                    if (Django.context.authenticated) {
                        return true;
                    }

                    return $q.reject({
                        type: 'authn',
                        context: Django.context,
                    });
                
                },
            },
        })
        .state('dataSearch', {
            url: '/agave-search/?query_string&offset&limit',
            component: 'dataDepotBrowser',
            params: {
                systemId: 'designsafe.storage.default',
                filePath: '$SEARCH',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'agave',
                        baseUrl: '/api/agave/files',
                        searchState: 'dataSearch',
                    };
                },
                auth: ($q, Django) => {
                    'ngInject';
                    if (Django.context.authenticated) {
                        return true;
                    }
                    return $q.reject({
                        type: 'authn',
                        context: Django.context,
                    });
                
                },
            },
        })
        .state('sharedData', {
            url: '/shared/{systemId}/{filePath:any}/',
            component: 'dataDepotBrowser',
            params: {
                systemId: 'designsafe.storage.default',
                filePath: '$SHARE',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'agave',
                        baseUrl: '/api/agave/files',
                    };
                },
                path: ($stateParams)=> {
                    'ngInject';
                    return $stateParams.filePath || '$SHARE/';
                },
                auth: ($q, Django) =>{
                    'ngInject';
                    if (Django.context.authenticated) {
                        return true;
                    }
                    return $q.reject({
                        type: 'authn',
                        context: Django.context,
                    });
                
                },
            },
        })
        .state('sharedDataSearch', {
            url: '/shared-search/?query_string&offset&limit&shared',
            component: 'dataDepotBrowser',
            params: {
                systemId: 'designsafe.storage.default',
                filePath: '$SEARCHSHARED',
                shared: 'true',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'agave',
                        baseUrl: '/api/agave/files',
                        searchState: 'sharedDataSearch',
                    };
                },
                auth: ($q, Django) => {
                    'ngInject';
                    if (Django.context.authenticated) {
                        return true;
                    }
                    return $q.reject({
                        type: 'authn',
                        context: Django.context,
                    });
                },
            },
        })
        .state('projects', {
            abstract: true,
            component: 'projectRoot',
        })
        .state('projects.list', {
            url: '/projects/',
            component: 'projectListing',
            params: {
                systemId: 'designsafe.storage.default',
            },
            resolve: {
                listing: [
                    '$stateParams',
                    'DataBrowserService',
                    function($stateParams, DataBrowserService) {
                        DataBrowserService.apiParams.searchState = 'projects.search';
                        var options = {
                            system: $stateParams.systemId || 'designsafe.storage.default',
                            path: $stateParams.filePath || Django.user,
                        };
                        if (options.path === '/') {
                            options.path = Django.user;
                        }
                        DataBrowserService.currentState.listing = {
                            system: 'designsafe.storage.default',
                            permissions: [],
                        };
                        delete DataBrowserService.currentState.project;
                    },
                ],
            },
        })
        .state('projects.view', {
            url: '/projects/{projectId}/',
            abstract: true,
            component: 'projectView',
            resolve: {
                projectId: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        'ngInject';
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        return $stateParams.projectId;
                    },
                ],
            },
        })
        .state('projects.view.data', {
            url: '{filePath:any}?query_string&offset&limit',
            component: 'projectData',
            params: {
                projectTitle: '',
                query_string: '',
                filePath: '/',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                        ProjectService.resolveParams.projectTitle = $stateParams.projectTitle;
                        ProjectService.resolveParams.query_string = $stateParams.query_string || '';
                    },
                ],
            },
        })
        .state('projects.curation', {
            url: '/projects/{projectId}/curation{filePath:any}',
            component: 'curationDirectory',
            params: {
                filePath: '/',
            },
            resolve: {
                projectId: ['$stateParams', 'ProjectService', ($stateParams, ProjectService) => {
                    ProjectService.resolveParams.projectId = $stateParams.projectId;
                    ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                }]
            }
        })
        .state('projects.preview', {
            url: '/projects/{projectId}/preview',
            component: 'publicationPreview',
            params: {
                filePath: '/',
                project: null,
                selectedListings: null,
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.previewSim', {
            url: '/projects/{projectId}/previewSim',
            component: 'publicationPreviewSim',
            params: {
                filePath: '/',
                project: null,
                selectedListings: null,
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.previewHybSim', {
            url: '/projects/{projectId}/previewHybSim',
            component: 'publicationPreviewHybSim',
            params: {
                filePath: '/',
                project: null,
                selectedListings: null,
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.previewOther', {
            url: '/projects/{projectId}/previewOther',
            component: 'publicationPreviewOther',
            params: {
                filePath: '/',
                project: null,
                selectedListings: null,
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineSelect', {
            url: '/projects/{projectId}/curation/selection',
            component: 'pipelineSelect',
            resolve: {
                projectId: ['$stateParams', 'ProjectService', ($stateParams, ProjectService) => {
                    ProjectService.resolveParams.projectId = $stateParams.projectId;
                    ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                }]
            }
        })
        .state('projects.pipelineSelectSim', {
            url: '/projects/{projectId}/curation/selectionSim',
            component: 'pipelineSelectSim',
            resolve: {
                projectId: ['$stateParams', 'ProjectService', ($stateParams, ProjectService) => {
                    ProjectService.resolveParams.projectId = $stateParams.projectId;
                    ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                }]
            }
        })
        .state('projects.pipelineSelectHybSim', {
            url: '/projects/{projectId}/curation/selectionHybSim',
            component: 'pipelineSelectHybSim',
            resolve: {
                projectId: ['$stateParams', 'ProjectService', ($stateParams, ProjectService) => {
                    ProjectService.resolveParams.projectId = $stateParams.projectId;
                    ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                }]
            }
        })
        .state('projects.pipelineSelectOther', {
            url: '/projects/{projectId}/curation/selectionOther{filePath:any}',
            component: 'pipelineSelectOther',
            params: {
                filePath: '/',
            },
            resolve: {
                projectId: ['$stateParams', 'ProjectService', ($stateParams, ProjectService) => {
                    ProjectService.resolveParams.projectId = $stateParams.projectId;
                    ProjectService.resolveParams.filePath = $stateParams.filePath || '/';
                }]
            }
        })
        .state('projects.pipelineProject', {
            url: '/projects/{projectId}/curation/project',
            component: 'pipelineProject',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineExperiment', {
            url: '/projects/{projectId}/curation/experiment',
            component: 'pipelineExperiment',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineSimulation', {
            url: '/projects/{projectId}/curation/simulation',
            component: 'pipelineSimulation',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineHybrid', {
            url: '/projects/{projectId}/curation/hybrid',
            component: 'pipelineHybrid',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineOther', {
            url: '/projects/{projectId}/curation/other',
            component: 'pipelineOther',
            params: {
                project: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineCategories', {
            url: '/projects/{projectId}/curation/categories',
            component: 'pipelineCategories',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineCategoriesSim', {
            url: '/projects/{projectId}/curation/categoriesSim',
            component: 'pipelineCategoriesSim',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineCategoriesHybSim', {
            url: '/projects/{projectId}/curation/categoriesHybSim',
            component: 'pipelineCategoriesHybSim',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineAuthors', {
            url: '/projects/{projectId}/curation/authors',
            component: 'pipelineAuthors',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineTeam', {
            url: '/projects/{projectId}/curation/team',
            component: 'pipelineTeam',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.pipelineLicenses', {
            url: '/projects/{projectId}/curation/licenses',
            component: 'pipelineLicenses',
            params: {
                project: '',
                experiment: '',
                selectedListings: '',
            },
            resolve: {
                params: [
                    '$stateParams',
                    'ProjectService',
                    ($stateParams, ProjectService) => {
                        ProjectService.resolveParams.projectId = $stateParams.projectId;
                        ProjectService.resolveParams.project = $stateParams.project;
                        ProjectService.resolveParams.experiment = $stateParams.experiment;
                        ProjectService.resolveParams.selectedListings = $stateParams.selectedListings;
                    },
                ],
            },
        })
        .state('projects.search', {
            url: '/project-search/?query_string&offset&limit&projects',
            component: 'projectSearch',
            params: {
                systemId: 'designsafe.storage.default',
                filePath: '',
            },
            resolve: {
                listing: [
                    '$stateParams',
                    'DataBrowserService',
                    function($stateParams, DataBrowserService) {
                        DataBrowserService.apiParams.fileMgr = 'agave';
                        DataBrowserService.apiParams.baseUrl = '/api/agave/files';
                        DataBrowserService.apiParams.searchState = 'projects.search';
                        var queryString = $stateParams.query_string;

                        var options = {
                            system: $stateParams.systemId,
                            query_string: queryString,
                            offset: $stateParams.offset,
                            limit: $stateParams.limit,
                            projects: true,
                        };
                        return DataBrowserService.search(options);
                    },
                ],
                auth: ($q, Django) => {
                    'ngInject';
                    if (Django.context.authenticated) {
                        return true;
                    }
                    return $q.reject({
                        type: 'authn',
                        context: Django.context,
                    });
                },
            },
        })
        .state('boxData', {
            url: '/box/{filePath:any}',
            component: 'dataDepotBrowser',
            params: {
                filePath: '',
                name: 'Box',
                customRootFilePath: 'box/',
            },
            resolve: {
                apiParams: ()=>{
                    return {
                        fileMgr: 'box',
                        baseUrl: '/api/external-resources/files',
                        searchState: undefined,
                    };
                },
                path: ($stateParams)=> {
                    'ngInject';
                    return $stateParams.filePath || '/';
                },
                auth: ($q, Django) => {
                    if (Django.context.authenticated) {
                        return true;
                    }
                    return $q.reject({
                        type: 'authn',
                        context: Django.context,
                    });
                },
            },
        })
        .state('dropboxData', {
            url: '/dropbox/{filePath:any}',
            component: 'dataDepotBrowser',
            params: {
                filePath: '',
                name: 'Dropbox',
                customRootFilePath: 'dropbox/',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'dropbox',
                        baseUrl: '/api/external-resources/files',
                        searchState: undefined,
                    };
                },
                path: ($stateParams) => {
                    'ngInject';
                    return $stateParams.filePath || '/';
                },
                auth: ($q, Django) => {
                    'ngInject';
                    if (Django.context.authenticated) {
                        return true;
                    }
                    return $q.reject({
                        type: 'authn',
                        context: Django.context,
                    });
                },
            },
        })
        .state('googledriveData', {
            url: '/googledrive/{filePath:any}',
            component: 'dataDepotBrowser',
            params: {
                filePath: '',
                name: 'Google Drive',
                customRootFilePath: 'googledrive/',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'googledrive',
                        baseUrl: '/api/external-resources/files',
                        searchState: undefined,
                    };
                },
                path: ($stateParams) => {
                    'ngInject';
                    return $stateParams.filePath || '/';
                },
                auth: ($q, Django) => {
                    'ngInject';
                    if (Django.context.authenticated) {
                        return true;
                    }
                    return $q.reject({
                        type: 'authn',
                        context: Django.context,
                    });
                },
            },
        })
        /* Public */
        .state('publicDataSearch', {
            url: '/public-search/?query_string&offset&limit',
            component: 'dataDepotPublicationsBrowser',
            params: {
                systemId: 'nees.public',
                filePath: '$SEARCH',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'public',
                        baseUrl: '/api/public/files',
                        searchState: 'publicDataSearch',
                    };
                },
                auth: () =>{
                    return true;
                },
            },
        })
        .state('communityDataSearch', {
            url: '/community-search/?query_string&offset&limit',
            component: 'dataDepotBrowser',
            params: {
                systemId: 'nees.public',
                filePath: '$SEARCH',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'public',
                        baseUrl: '/api/public/files',
                        searchState: 'communityDataSearch',
                    };
                },
                auth: () => {
                    return true;
                },
            },
        })
        .state('communityData', {
            url: '/public/designsafe.storage.community/{filePath:any}',
            component: 'dataDepotBrowser',
            params: {
                systemId: 'designsafe.storage.community',
                filePath: '/',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'community',
                        baseUrl: '/api/public/files',
                        searchState: 'communityDataSearch',
                    };
                },
                path: ($stateParams)=>{
                    'ngInject';
                    return $stateParams.filePath || '/';
                },
                auth: () => {
                    return true;
                },
            },
        })
        .state('publicData', {
            url: '/public/',
            component: 'dataDepotPublicationsBrowser',
            params: {
                systemId: 'nees.public',
                filePath: '',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'public',
                        baseUrl: '/api/public/files',
                        searchState: 'publicDataSearch',
                    };
                },
                path: ($stateParams)=>{
                    'ngInject';
                    return $stateParams.filePath || '/';
                },
                auth: () => {
                    return true;
                },
            },
        })
        .state('neesPublished', {
            url: '/public/nees.public/{filePath:any}',
            component: 'neesPublished',
            params: {
                systemId: 'nees.public',
                filePath: '',
            },
            resolve: {
                apiParams: ()=> {
                    return {
                        fileMgr: 'public',
                        baseUrl: '/api/public/files',
                        searchState: 'publicDataSearch',
                    };
                },
                path: ($stateParams)=>{
                    'ngInject';
                    return $stateParams.filePath || '/';
                },
                auth: () => {
                    return true;
                },
            },
        })
        .state('publishedData', {
            url: '/public/designsafe.storage.published/{filePath:any}',
            component: 'published',
            params: {
                systemId: 'designsafe.storage.published',
                filePath: '',
            },
            onExit: ($window) => {
                'ngInject';
                ['description', 'citation_title', 'citation_publication_date',
                    'citation_doi', 'citation_abstract_html_url'].forEach(
                    (name) => {
                        let el = $window.document.getElementsByName(name);
                        el[0].content = '';
                    }
                );
                ['citation_author', 'citation_author_institution',
                    'citation_keywords'].forEach(
                    (name) => {
                        let els = $window.document.getElementsByName(name);
                        while(els[0]){
                            els[0].parentNode.removeChild(els[0]);
                        }
                    }
                );
            },
            resolve: {
                listing: ($stateParams, DataBrowserService)=>{
                    'ngInject';
                    let systemId = $stateParams.systemId || 'designsafe.storage.published';
                    let filePath = $stateParams.filePath;
                    DataBrowserService.apiParams.fileMgr = 'published';
                    DataBrowserService.apiParams.baseUrl = '/api/public/files';
                    DataBrowserService.apiParams.searchState = 'publicDataSearch';
                    return DataBrowserService.browse({ system: systemId, path: filePath });
                },
                auth: () => {
                    return true;
                },
            }
        })
        .state('trainingMaterials', {
            url: '/training/',
            template: '<pre>local/trainingMaterials.html</pre>',
        });

    $urlRouterProvider.otherwise(function($injector) {
        var $state = $injector.get('$state');

        /* Default to MyData for authenticated users, PublicData for anonymous */
        if (Django.context.authenticated) {
            $state.go('myData', {
                systemId: 'designsafe.storage.default',
                filePath: Django.user,
            });
        } else {
            $state.go('publicData');
        }
    });
}

ddModule
    .config([
        '$httpProvider',
        '$locationProvider',
        '$stateProvider',
        '$urlRouterProvider',
        '$urlMatcherFactoryProvider',
        'Django',
        'toastrConfig',
        config,
    ])
    .run([
        '$rootScope',
        '$location',
        '$state',
        'Django',
        function($rootScope, $location, $state, Django) {
            $rootScope.$state = $state;
            $rootScope.$on('$stateChangeStart', function(event, toState, toParams) {
                if (toState.name === 'myData' || toState.name === 'sharedData') {
                    var ownerPath = new RegExp('^/?' + Django.user).test(toParams.filePath);
                    if (toState.name === 'myData' && !ownerPath) {
                        event.preventDefault();
                        $state.go('sharedData', toParams);
                    } else if (toState.name === 'sharedData' && ownerPath) {
                        event.preventDefault();
                        $state.go('myData', toParams);
                    }
                }
            });

            $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
                if (error.type === 'authn') {
                    var redirectUrl = $state.href(toState.name, toParams);
                    window.location = '/login/?next=' + redirectUrl;
                }
            });
        },
    ]);

ddModule.config([
    'WSBusServiceProvider',
    function(WSBusServiceProvider) {
        WSBusServiceProvider.setUrl(
            (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
                window.location.hostname +
                (window.location.port ? ':' + window.location.port : '') +
                '/ws/websockets?subscribe-broadcast&subscribe-user'
        );
    },
]);
export default ddModule;
