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
                        .selector('node.pdg')
                            .css({
                                'content': 'data(id)',
    							'text-opacity': 0.5,
    							'text-valign': 'center',
    							'text-halign': 'right',
    							'background-color': function(ele) { return ele.data('bg'); }//'#11479e' should be memoized
                            })
                        .selector('node.hidden')
                            .css({
                                width:8,
                                height:8
                            })
                        .selector('edge.pdg')
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
                        .selector('edge.dividedEdge')
                            .css({
                                'line-color': function(ele) { return ele.data('c'); },
                                'label': function(ele) { return ele.data('l'); },
                                'font-size': 12
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

                cy.on('click', function(e){
                  var ele = e.cyTarget;
                  console.log('clicked ' + ele.id());
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

            cy.add(nodes).addClass('pdg');

            var controlEdges = edges.filter(function(e) { return e.isType(EDGES.CONTROL); });
            cy.add(controlEdges).addClass('pdg');
            //cy.edges().addClass('straightEdge');
            var rest = edges.filter(function(e) { return ! e.isType(EDGES.CONTROL); });
            //cy.add(rest);
            //var coll = cy.collection(nodes + rest);
            //console.log(rest);
            //coll.add(cy.filter( function(i,e) {return e.group == "nodes"; }));
            //coll.add(cy.filter( function(i,e) {console.log(e); }));
            //var secondLayout = coll.makeLayout({name:'dagre'});//cy.elements().makeLayout({name:'dagre'});
            var controlLayout = cy.elements().makeLayout({name:'dagre', minLen: function( edge ){ return 2; }});

            controlLayout.run();

            var dataEdges = edges.filter(function(e) {
                return e.isType(EDGES.DATA) || e.isType(EDGES.REMOTED);
            });

            var callEdges = edges.filter(function(e) {
                return e.isType(EDGES.CALL) || e.isType(EDGES.REMOTEC);
            });

            var parameterEdges = edges.filter(function(e) {
                return e.isType(EDGES.PARIN) || e.isType(EDGES.PAROUT)
                    || e.isType(EDGES.REMOTEPARIN) || e.isType(EDGES.REMOTEPAROUT);
            });

            console.log(parameterEdges);

            var updatedDataEdges = [];
            var idx = 0;
            dataEdges.forEach(function(e) {
                var source = cy.getElementById(e.getSource());
                var target = cy.getElementById(e.getTarget());
                idx++;
                var toAdd = e.divideDataEdge(e, idx, source, target);
                idx++;
                updatedDataEdges = updatedDataEdges.concat(toAdd);
            });
            var updatedParameterEdges = [];
            parameterEdges.forEach(function(e) {
                var source = cy.getElementById(e.getSource());
                var target = cy.getElementById(e.getTarget());
                idx ++;
                var toAdd = e.divideParameterEdge(e, idx, source, target);
                idx ++;
                updatedParameterEdges = updatedParameterEdges.concat(toAdd);
            });

            cy.add(callEdges).addClass('pdg');
            cy.add(updatedParameterEdges);
            cy.add(updatedDataEdges);

            var restLayout = cy.collection(callEdges + updatedDataEdges + updatedParameterEdges).makeLayout({name:'dagre'});

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
    .factory('cyEdge',['cyHiddenNode', 'cyDividedEdge', function(cyHiddenNode, cyDividedEdge) {
        var control = '#11479e',
            call = '#66ff66',
            remoteCall = '#009933',
            data = '#6699ff',
            remoteData = '#333fff',
            par =  '#cc9900',
            remotePar = '#663300',
            rest = '#cc99ff';

        var color = undefined;

        function divideEdge(e, idx, source, target, calculateY) {
            var toAdd = [];

            if(source.position() != undefined && target.position() != undefined) {
                var sourcePosition = source.position();
                var targetPosition = target.position();
                var newY = calculateY(targetPosition.y, target.height());
                var newX1 = targetPosition.x;
                var newX2 = sourcePosition.x;

                var position1 = { x:newX1, y:newY };
                var position2 = { x:newX2, y:newY };

                var hiddenNode1 = cyHiddenNode.create(position1, idx);
                idx ++;
                var hiddenNode2 = cyHiddenNode.create(position2, idx);

                var edge1 = cyDividedEdge.create(e, e.getSource(), hiddenNode2.data.id, e.data.id + "1", 'dividedEdge', '');
                var edge2 = cyDividedEdge.create(e, hiddenNode2.data.id, hiddenNode1.data.id, e.data.id + "2", 'dividedEdge', e.content.type.name);
                var edge3 = cyDividedEdge.create(e, hiddenNode1.data.id, e.getTarget(), e.data.id + "3", 'pdg', '');

                toAdd = [hiddenNode1, hiddenNode2, edge1, edge2, edge3];
            }

            return toAdd;
        }

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
                    },
                    divideDataEdge: function(e, idx, source, target) {
                        return divideEdge(e, idx, source, target,
                            function calculateY(a,b) {
                                return a - (b * 2);
                        });
                    },
                    divideParameterEdge: function(e, idx, source, target) {
                        return divideEdge(e, idx, source, target,
                            function calculateY(a,b) {
                                return a + b;
                        });
                    }
                };
            }
        };
    }])
    .factory('cyHiddenNode', function() {
        return {
            create: function(pos, idx) {
                return {
                    group: "nodes",
                    data: {
                        id: "hiddenNode" + idx,
                        bg: "#11479e"
                    },
                    position: pos,
                    selectable: false,
                    classes: 'hidden'
                };
            }
        };
    })
    .factory('cyDividedEdge', function() {
        return {
            create: function(edge, from, to, id, style, type) {
                return {
                    group: "edges",
                    data: {
                        id: "de" + id,
                        c: edge.data.c,
                        l: type,
                        source: from,
                        target: to
                    },
                    content: edge,
                    classes: style
                };
            }
        };
    });
