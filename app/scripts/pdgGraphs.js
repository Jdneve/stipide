"use strict"

//copied

function createPDGGraph (PDG, assumes)
{
    var edges = [];
    var nodes = [];
    var graphnodes = [];
    var removes = [];
    var removed = [];
    var assumesnames = assumes.map(function (ass) {
        if (ass.id)
            return ass.id.name.trim();
        else
            return ass.declarations[0].id.name.trim()});
    var remove = function (node) {
        nodes = nodes.remove(node);
        removed.push(node);
        if (node.isEntryNode) {
            var params = node.getFormalIn().concat(node.getFormalOut()),
            body   = node.getBody();
            params.map(function (param) {nodes = nodes.remove(param); removed.push(param);});
            body.map(function (bodynode) {remove(bodynode); });
        }
        else if (node.isStatementNode) {
            node.getOutEdges(EDGES.CONTROL)
                .map(function (e) {remove(e.to)});
            node.getOutEdges(EDGES.DATA)
                .filter(function (e) {
                    return e.to.isObjectEntry ||
                            e.to.isEntryNode})
                .map(function (e) {
                    remove(e.to);});
        }
        else if (node.isObjectEntry) {
            node.getOutEdges(EDGES.OBJMEMBER).map(function (e) {
                remove(e.to)
            });
            node.getOutNodes(EDGES.DATA).filter(function (n) {return n.isFormalNode})
                .map(function (n) {remove(n)});
        }
    };
    nodes = PDG.nodes.filter(function (pdgnode) {
        if (pdgnode.parsenode)
            if (Aux.isFunDecl(pdgnode.parsenode) &&
                assumesnames.indexOf(pdgnode.parsenode.id.name) > -1) {
                removes.push(pdgnode);
                return false;
            }
            else if (Aux.isVarDeclarator(pdgnode.parsenode) &&
                assumesnames.indexOf(pdgnode.parsenode.id.name) > -1) {
                removes.push(pdgnode);
                return false;
            }
            else if (Aux.isObjExp(pdgnode.parsenode)) {
              var decl = pdgnode.getInNodes(EDGES.DATA)
                          .filter(function (n) {return n.name && assumesnames.indexOf(n.name) > -1});
              if (decl.length > 0) {
                removes.push(decl[0]);
              }
            }
            else
                return true;
        else
            return true;
    });

    removes.map(function(node) {
        remove(node);
    });

    nodes.map(function (node) {
        var to_nodes = [],
            add = function (n) {
                var sourceIndex = Arrays.indexOf(n, graphnodes);
                if (sourceIndex < 0) {
                    if (!(removed.indexOf(n) > -1))
                        graphnodes.push(n)
                }
            },
            addEdges = function (n) {
                var to_edges = n.getOutEdges().filter(function (e) {
                    return Arrays.indexOf(e, edges) < 0 //&& e.equalsType(EDGES.CONTROL);
                });
                edges = edges.concat(to_edges);
                to_nodes = to_nodes.concat(to_edges.map(function (e) {return e.to}));
            };

        if (!(removed.indexOf(node) > -1)) {
            add(node);
            if (node.getOutEdges().length)
                addEdges(node)
            while (to_nodes.length) {
                var n = to_nodes.shift();
                add(n);
                addEdges(n)
            }
        }
    });

    var states = graphnodes.map( function (node, id) {
        var label    = node.id,
            parsed   = node.parsenode,
            dtype    = node.getdtype && node.getdtype() ? node.getdtype().name : false,
            tooltip  = parsed ? parsed.toString() :  "",
            cssclass = label.slice(0,1) + " " + dtype;
        if(node.isActualPNode)
            node.value ? label += " " + node.value.slice(0,10) : label;
        if(node.isFormalNode)
            label += " " + node.name.slice(0,10);
        if(dtype === "server")
            label += "[S]"
        if(dtype === "client")
            label += "[C]"
        if(dtype === "shared")
            label += "[Sh]"
        if(node.parsenode)
            label += " " + ((parsed && parsed.toString().length > 10) ? parsed.toString().slice(0,10)+"..." : parsed) ;
        if (node.isStatementNode &&
            (Aux.isThrowStm(node.parsenode) ||
                Aux.isTryStm(node.parsenode) ||
                Aux.isCatchStm(node.parsenode))) {
            cssclass += " error"
        }
        node.cssclass = cssclass;
        return {
            id: id,
            label: label,
            description: node.parsenode ? node.parsenode.toString() : ""}
        }
    );

    var edgeId = 0;
    var transitions = edges.map(function (edge) {
        var g = edge.type.name;
        var label = "";
        label += g;
        if (edge.label === false) label += " (false)";
        return {
            id: edgeId++,
            source: Arrays.indexOf(edge.from, graphnodes),
            target: Arrays.indexOf(edge.to, graphnodes),
            label: label,
            orig: edge
        }
    });


    return [graphnodes, edges];

}
