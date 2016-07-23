'use strict';

/**
 * @ngdoc function
 * @name stipideApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the stipideApp
 */
angular.module('stipideApp')
    .controller('MainCtrl', function(){})
    .controller('GraphCtrl', [ '$scope', 'pdgGraph', function($scope, pdgGraph){
        var cy;

        $scope.nodes = [
        /*    { data: { id: 'n0' } },
            { data: { id: 'n1' } },
            { data: { id: 'n2' } },
            { data: { id: 'n3' } },
            { data: { id: 'n4' } },
            { data: { id: 'n5' } },
            { data: { id: 'n6' } },
            { data: { id: 'n7' } },
            { data: { id: 'n8' } },
            { data: { id: 'n9' } },
            { data: { id: 'n10' } },
            { data: { id: 'n11' } },
            { data: { id: 'n12' } },
            { data: { id: 'n13' } },
            { data: { id: 'n14' } },
            { data: { id: 'n15' } },
            { data: { id: 'n16' } } */
        ];

        $scope.edges = [
        /*    { data: { source: 'n0', target: 'n1' } },
            { data: { source: 'n1', target: 'n2' } },
            { data: { source: 'n1', target: 'n3' } },
            { data: { source: 'n4', target: 'n5' } },
            { data: { source: 'n4', target: 'n6' } },
            { data: { source: 'n6', target: 'n7' } },
            { data: { source: 'n6', target: 'n8' } },
            { data: { source: 'n8', target: 'n9' } },
            { data: { source: 'n8', target: 'n10' } },
            { data: { source: 'n11', target: 'n12' } },
            { data: { source: 'n12', target: 'n13' } },
            { data: { source: 'n13', target: 'n14' } },
            { data: { source: 'n13', target: 'n15' } }, */
        ];

        pdgGraph($scope.nodes, $scope.edges).then(function(pdgCy){
            cy = pdgCy;
            $scope.cyLoaded = true;
        });
    }])
    .controller('EditorCtrl', [ '$scope', 'pdgGraph', 'cyNode', 'cyEdge',
        function($scope, pdgGraph, cyNode, cyEdge) {

        $scope.aceLoaded = function(_editor) {
            $scope.aceSession = _editor.getSession();
            $scope.aceSession.setUndoManager(new ace.UndoManager());
            console.log('ace loaded');
        };

        $scope.aceChanged = function() {

            var src = $scope.aceSession.getDocument().getValue();
            //console.log(src);

            var ast = Ast.createAst(src, {loc:true, owningComments: true, comment: true});
            //console.log(compare(ast, $scope.currentAst));
            //if (compareAst(ast, $scope.currentAst)) {
                $scope.currentAst = ast;
                ast = Hoist.hoist(ast, function (node) {
                        return Aux.isBlockStm(node) &&
                            (Comments.isTierAnnotated(node) ||
                                (node.leadingComment && Comments.isBlockingAnnotated(node.leadingComment)));
                });
                //console.log(ast);

                var preanalysis = pre_analyse(ast, {callbacks: [], identifiers: []});
                src = escodegen.generate(preanalysis.ast);
                //console.log(src);

                var assumes = preanalysis.assumes;
                var shared  = preanalysis.shared;
                var asyncs  = preanalysis.asyncs;
                var graphs = new Stip.Graphs(preanalysis.ast, src, preanalysis.primitives);
                Stip.start(graphs);
                //console.log(graphs);

                var cytoscapeGraph = createPDGGraph(graphs.PDG, assumes);

                // var create_cy_node = function (node) {
                //     return { group: "nodes",
                //             data: {id: node.id},
                //             content: node };
                // };


                // var create_cy_edge = function (edge) {
                //     var edge_obj = {group: "edges",
                //                     data: {
                //                         id: "e" + edgeId,
                //                         source: edge.from.id,
                //                         target: edge.to.id
                //                     },
                //                     content:edge};
                //     edgeId++;
                //     return edge_obj;
                // }

                var ids = [];
                var edgeId = 0;

                $scope.nodes = cytoscapeGraph[0].map (function (n) {
                    ids.push(n.id);
                    return cyNode.create(n);});

                $scope.edges = cytoscapeGraph[1]
                    //.filter (function (e) {
                    //    var f = e.from.id,
                    //        t = e.to.id;
                    //    return (ids.indexOf(f) != -1 || ids.indexOf(t) != -1)})
                    .map (function (e) {
                        edgeId ++;
                        return cyEdge.create(e, edgeId); });

                console.log($scope.nodes);
                console.log($scope.edges);

                pdgGraph.addNodesWithEdges($scope.nodes, $scope.edges);

            //}
            return true;
        };
    }])
    .controller('TestButtonCtrl', ['$scope', 'pdgGraph', function($scope, pdgGraph) {

        $scope.on = false;

        $scope.onTestPush = function() {
            if ($scope.on) {
                pdgGraph.delTestEdge();
            } else {
                pdgGraph.addTestEdge();
            }
            $scope.on = ! $scope.on;
        };

        pdgGraph.onTestPush(function() {
            $scope.$apply();
        });
    }]);
