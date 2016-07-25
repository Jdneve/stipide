'use strict';

/**
 * @ngdoc overview
 * @name stipideApp
 * @description
 * # stipideApp
 *
 * Main module of the application.
 */
angular
    .module('stipideApp', [
        'ngAnimate',
        'ngCookies',
        'ngResource',
        'ngRoute',
        'ngSanitize',
        'ngTouch',
        'ui.ace'
    ])
    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'views/main.html',
                controller: 'MainCtrl',
                controllerAs: 'main'
            })
            .when('/about', {
                templateUrl: 'views/about.html',
                controller: 'AboutCtrl',
                controllerAs: 'about'
            })
            .otherwise({
                redirectTo: '/'
            });
        })
    .factory('pdgGraph', [ '$q', function( $q ){
        var cy;
        var pdgGraph = function(n, e){
            var deferred = $q.defer();

            var eles = {
                nodes: n,
                edges: e
            };

            $(function(){ // on dom ready

                cy = cytoscape({
                    container: $('#cy')[0],

                    style: cytoscape.stylesheet()
                        .selector('node')
                            .css({
                                'content': 'data(id)',
    							'text-opacity': 0.5,
    							'text-valign': 'center',
    							'text-halign': 'right',
    							'background-color': function(ele) { return ele.data('bg'); }//'#11479e' should be memoized
                            })
                        .selector('edge')
                            .css({
                              'target-arrow-shape': 'triangle',
                              'line-color': function(ele) { return ele.data('c'); },
                              'target-arrow-color': function(ele) { return ele.data('c'); },
                              'label': function(ele) { return ele.data('l'); },
                              'font-size': 12
                              /*'curve-style': 'segments',
                              'segment-distances': '40 40',
                              'segment-weights': '0.25 0.75'*/
                            })
                        .selector('edge.segementedEdge')
                            .css({
                                'curve-style': 'segments',
                                'segment-distances': '20 40 20'
                            })
                        .selector(':selected')
                            .css({
                                'background-color': 'black',
                                'line-color': 'black',
                                'target-arrow-color': 'black',
                                'source-arrow-color': 'black',
                                'text-outline-color': 'black'
                            }),
                    layout: {
                        name: 'dagre'
                    },
                    elements: eles,

                });
            }); // on dom ready

            return deferred.promise;
        };

        pdgGraph.listeners = {};

        function fire(e, args){
            var listeners = pdgGraph.listeners[e];

            for( var i = 0; listeners && i < listeners.length; i++ ){
                var fn = listeners[i];
                fn.apply( fn, args );
            }
        }

        function listen(e, fn){
            var listeners = pdgGraph.listeners[e] = pdgGraph.listeners[e] || [];
            listeners.push(fn);
        }

        pdgGraph.addNodes = function(nodes) {
            cy.add(nodes);
            cy.layout({name:'dagre'});
            return cy.ready(function (event) { console.log(event); });
        };

        pdgGraph.addNodesWithEdges = function(nodes, edges) {
            //remove all
            cy.remove(cy.elements());

            console.log(nodes);
            console.log(edges);
            cy.add(nodes);

            var controlEdges = edges.filter(function(e) { return e.isType(EDGES.CONTROL); });
            cy.add(controlEdges).addClass('straightEdge');
            //cy.edges().addClass('straightEdge');
            var rest = edges.filter(function(e) { return ! e.content.equalsType(EDGES.CONTROL); });
            //cy.add(rest);
            //var coll = cy.collection(nodes + rest);
            //console.log(rest);
            //coll.add(cy.filter( function(i,e) {return e.group == "nodes"; }));
            //coll.add(cy.filter( function(i,e) {console.log(e); }));
            //var secondLayout = coll.makeLayout({name:'dagre'});//cy.elements().makeLayout({name:'dagre'});
            var controlLayout = cy.elements().makeLayout({name:'dagre'});

            var dataEdges = edges.filter(function(e) {
                return e.isType(EDGES.DATA) || e.isType(EDGES.REMOTED);
            });
            cy.add(dataEdges).addClass('segementedEdge');
            // dataEdges.forEach(function(e,i) {
            //     var source = cy.getElementById(e.getSource());
            //     var target = cy.getElementById(e.getTarget());
            //
            //     if(source && target) {
            //         var sourcePosition = source.position();
            //         var targetPosition = target.position();
            //
            //         console.log(sourcePosition);
            //     }

            //});

            var callEdges = edges.filter(function(e) {
                return e.isType(EDGES.CALL) || e.isType(EDGES.REMOTEC);
            });
            cy.add(callEdges).addClass('straightEdge');


            var restLayout = cy.collection(dataEdges + callEdges).makeLayout({name:'dagre'});
            controlLayout.run();
            return restLayout.run();
            //return secondLayout.run();
            //return cy.ready(function (event) {console.log(event);});
        };

        return pdgGraph;
    }])
    .factory('cyNode', function(){
        var blue = '#0000ff',
            red = '#ff0000',
            yellow = '#ffff00';

        var color = yellow;

        return {
            create: function(node) {
                if(node.isServerNode()) { color = blue; }
                else if(node.isClientNode()) { color = red; };

                return {
                    group: "nodes",
                    data: {
                        id: node.id,
                        bg: color },
                    content: node
                };
            }
        };
    })
    .factory('cyEdge', function() {
        var control = '#11479e',
            call = '#66ff66',
            remoteCall = '#009933',
            data = '#6699ff',
            remoteData = '#333fff',
            par =  '#cc9900',
            remotePar = '#663300',
            rest = '#cc99ff';

        var color = undefined;

        return {
            create: function(edge, eid) {
                if(edge.equalsType(EDGES.CONTROL)) { color = control; }
                else if(edge.equalsType(EDGES.CALL)) { color = call; }
                else if(edge.equalsType(EDGES.REMOTEC)) { color = remoteCall; }
                else if(edge.equalsType(EDGES.DATA)) { color = data; }
                else if(edge.equalsType(EDGES.REMOTED)) { color = remoteData; }
                else if(edge.equalsType(EDGES.PARIN) ||
                        edge.equalsType(EDGES.PAROUT)) {color = par; }
                else if(edge.equalsType(EDGES.REMOTEPARIN) ||
                        edge.equalsType(EDGES.REMOTEPAROUT)) { color = remotePar; }
                else { color = rest };

                return {
                    group: "edges",
                    data: {
                        id: "e" + eid,
                        c: color,
                        l: edge.type.name,
                        source: edge.from.id,
                        target: edge.to.id
                    },
                    content: edge,

                    isType: function(type) {
                        return this.content.equalsType(type);
                    },

                    getSource: function() {
                        return this.data.source;
                    },
                    getTarget: function() {
                        return this.data.target;
                    }
                };
            }
        };
    });
