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
    .factory('pdgGraph', [ '$q', 'collapsible', function( $q, collapsible ){
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
                        .selector('node.collapsed')
                            .css({
                                opacity: 0
                            })
                        .selector('$node > node')
                            .css({
                                'padding-top': '10px',
                                'padding-left': '10px',
                                'padding-bottom': '10px',
                                'padding-right': '10px',
                                'text-valign': 'top',
                                'text-halign': 'center',
                                'background-color': '#bbb',
                                'content': 'data(id)'
                            })
                        .selector('edge.pdg')
                            .css({
                              'target-arrow-shape': 'triangle',
                              'line-color': function(ele) { return ele.data('c'); },
                              'target-arrow-color': function(ele) { return ele.data('c'); },
                              'label': function(ele) { return ele.data('l'); },
                              'font-size': 12,
                              'z-index' : 3
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
                        .selector('edge.selectedEdge')
                            .css({
                                'background-color': 'black',
                                'line-color': 'black',
                                'target-arrow-color': 'black',
                                'source-arrow-color': 'black',
                                'text-outline-color': 'black',
                                'z-index' : 4
                            })
                        .selector('edge.collapsed')
                            .css({
                                opacity: 0
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
                    function hasHiddenNode(ele) {
                        var filtered = ele.connectedNodes().filter(function(i, ele) {
                            return ele.hasClass('hidden');
                        });
                        return filtered.size() > 0;
                    }
                    function highlight(ele) {
                        var id = ele.id();
                        var slicedId = id.slice(0,id.length-1);
                        for(var i = 1; i<4; i++) {
                            var cyElm = cy.getElementById(slicedId + i);
                            cyElm.flashClass('selectedEdge', 2500);
                            cyElm.select();
                        }
                    }
                    if(ele.isNode()) {
                        if(ele.isExpandable()) {
                            ele.expand({fisheye: false, animate:false, cueEnabled:false});
                        } else {
                            ele.collapse({fisheye: false, animate:false, cueEnabled:false});
                        }
                    } else if(ele.isEdge()) {
                        ele.connectedNodes().each(function(i, node) {
                            if(node.hasClass('hidden')) {
                                highlight(ele);
                            }
                        });
                        ele.flashClass('selectedEdge', 2500);
                    }
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

        pdgGraph.initNodes = [
            {data: {id:'serverParent'}},
            {data: {id:'clientParent'}},
            {data: {id:'sharedParent'}}
        ];

        pdgGraph.options = {};

        pdgGraph.setEdgeOption = function(option) {
            pdgGraph.options.edge = option;
        }

        pdgGraph.setLayoutOption = function(option) {
            pdgGraph.options.layout = option;
        }

        pdgGraph.rememberPositions = function(positions) {
            pdgGraph.options.positions = positions;
        }

        pdgGraph.retrievePositions = function() {
            return pdgGraph.options.positions;
        }

        pdgGraph.addNodes = function(nodes) {
            cy.add(nodes);
            cy.layout({name:'dagre'});
            return cy.ready(function (event) { console.log(event); });
        };

        pdgGraph.addNodesWithEdges = function(nodes, edges) {
            //remove all
            cy.remove(cy.elements());

            //cy.add(pdgGraph.initNodes);

            var optionEdge = pdgGraph.options.edge.id;
            var optionLayout = pdgGraph.options.layout.id;
            var controlEdges = edges.filter(function(e) { return e.isType(EDGES.CONTROL); });
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

            if(optionLayout == 1) {
                cy.add(nodes).addClass('pdg');
                cy.add(controlEdges).addClass('pdg');

                if(optionEdge >= 2) {
                    cy.add(dataEdges).addClass('pdg');
                }
                if(optionEdge >= 3) {
                    cy.add(callEdges).addClass('pdg');
                }
                if(optionEdge >= 4) {
                    cy.add(parameterEdges).addClass('pdg');
                }

                var layout = cy.elements().makeLayout({name:'dagre'});

                return layout.run();
            }
            if(optionLayout >= 2) {

                var updatedNodes = nodes;

                if(optionLayout == 3) {
                    var colData = collapsible.create(nodes);
                    var colMap = colData.colMap;
                    cy.add(colData.toAdd);
                    updatedNodes = nodes.map(function(n) {
                        var colObj = colMap.find(n.content.id);
                        if(colObj) {
                            n.data.parent = colObj.par;
                        }
                        return n;
                    });
                }

                cy.add(updatedNodes).addClass('pdg');
                cy.add(controlEdges).addClass('pdg');
                //draw this
                var controlLayout = cy.elements().makeLayout({name:'dagre', minLen: function( edge ){ return 2; }});
                controlLayout.run();

                var updatedDataEdges = [];
                var updatedCallEdges = [];
                var updatedParameterEdges = [];

                var idx = 0;
                if(optionEdge >= 2) {
                    dataEdges.forEach(function(e) {
                        var source = cy.getElementById(e.getSource());
                        var target = cy.getElementById(e.getTarget());
                        idx++;
                        var toAdd = e.divideDataEdge(e, idx, source, target);
                        idx++;
                        updatedDataEdges = updatedDataEdges.concat(toAdd);
                    });
                }
                if(optionEdge >= 3) {
                    updatedCallEdges = callEdges;
                }
                if(optionEdge >= 4) {
                    parameterEdges.forEach(function(e) {
                        var source = cy.getElementById(e.getSource());
                        var target = cy.getElementById(e.getTarget());
                        idx ++;
                        var toAdd = e.divideParameterEdge(e, idx, source, target);
                        idx ++;
                        updatedParameterEdges = updatedParameterEdges.concat(toAdd);
                    });
                }

                cy.add(updatedCallEdges).addClass('pdg');
                cy.add(updatedParameterEdges);
                cy.add(updatedDataEdges);

                var restLayout = cy.collection(updatedCallEdges + updatedDataEdges + updatedParameterEdges).makeLayout({name:'dagre'});

                cy.nodes().on("beforeCollapse", function() {
                    pdgGraph.rememberPositions(cy.nodes().positions());
                });

                cy.nodes().on("afterExpand", function() {
                    cy.nodes().positions(pdgGraph.retrievePositions());
                });

                return restLayout.run();
            }
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
                if(node.isServerNode()) {
                    color = blue;
                    //par = 'serverParent';
                } else if(node.isClientNode()) {
                    color = red;
                    //par = 'clientParent';
                };

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

                var targetParent = target.parent().id();
                var sourceParent = source.parent().id();

                var hiddenNode1 = cyHiddenNode.create(position1, idx, targetParent);
                idx ++;
                var hiddenNode2 = cyHiddenNode.create(position2, idx, sourceParent);

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
            create: function(pos, idx, par) {
                return {
                    group: "nodes",
                    data: {
                        id: "hiddenNode" + idx,
                        parent: par,
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
    })
    .factory('collapsible', ['collapsibleMap', function(collapsibleMap) {
        function addToCollapsible(node, parent, colMap) {
            node.getOutNodes(EDGES.CONTROL).forEach(function(dependentNode) {
                var depId = dependentNode.id;
                colMap.add({id:depId, par:parent});
                addToCollapsible(dependentNode, parent, colMap);
            });
        }
        return {
            create: function(nodes) {
                var colMap = collapsibleMap.create();
                var collapsiblePdgNodes = [];
                nodes.forEach(function(n) {
                    var pdgNode = n.content;
                    if (pdgNode instanceof EntryNode) {
                        var newId = 'coll' + n.data.id;
                        //var newParent = n.data.parent;
                        //console.log(newParent);
                        n.data.parent = newId;
                        addToCollapsible(pdgNode, newId, colMap);
                        var newParent = colMap.find(n.data.id);
                        var newParentId = undefined;
                        if(newParent) {
                            newParentId = newParent.par;
                        }
                        console.log(newParentId);
                        collapsiblePdgNodes.push({data: {id:newId, parent:newParentId}});
                    }
                });
                return {colMap: colMap, toAdd:collapsiblePdgNodes};
            }
        }
    }])
    .factory('collapsibleMap', function() {
        return {
            create: function() {
                return {
                    currentMap: [],

                    add: function(colObj) {
                        var idx = this.currentMap.findIndex(function(val) {
                            return colObj.id == val.id
                        });
                        if(idx > -1) {
                            this.currentMap[idx] = colObj;
                        } else {
                            this.currentMap.push(colObj);
                        }
                    },
                    find: function(id) {
                        return this.currentMap.find(function(val) {
                            return val.id == id;
                        });
                    }
                }
            }
        };
    });
