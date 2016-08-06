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

        $scope.nodes = [];

        $scope.edges = [];

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

                pdgGraph.addNodesWithEdges($scope.nodes, $scope.edges);

            //}
            return true;
        };
    }])
    .controller('ChooseEdgeController', ['$scope', 'pdgGraph', function($scope, pdgGraph) {

        $scope.data = {};

        $scope.data.availableEdges = [
            {id: '1', name: 'Control Edges Only'},
            {id: '2', name: 'Control and Data Edges'},
            {id: '3', name: 'Control, Data and Call Edges'},
            {id: '4', name: 'Control, Data, Call and Parameter Edges'}
        ];
        $scope.data.selectedEdge = {id: '4', name: 'Control, Data, Call and Parameter Edges'};

        $scope.adaptEdgeChoice = function() {
            pdgGraph.setEdgeOption($scope.data.selectedEdge);
        }

        $scope.adaptEdgeChoice();
    }])
    .controller('ChooseLayoutController', ['$scope', 'pdgGraph', function($scope, pdgGraph) {

        $scope.data = {};

        $scope.data.availableLayouts = [
            {id: '1', name: 'Directed Acyclic Graph'},
            {id: '2', name: 'Dagre using Krinke for cross- & backedges'}
        ];
        $scope.data.selectedLayout = {id:'2', name: 'Dagre using Krinke for cross- & backedges'};

        $scope.adaptLayoutChoice = function() {
            pdgGraph.setLayoutOption($scope.data.selectedLayout);
        }

        $scope.adaptLayoutChoice();
    }]);
