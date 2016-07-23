
exports.create_cy_node = function(node) {
    return {
        group: "nodes",
        data: {id: node.id},
        content: node
    };
};

exports.create_cy_edge = function(edge, eid) {
    return {
        group: "edges",
        data: {
            id: "e" + eid,
            source: edge.from.id,
            target: edge.to.id
        },
        content: edge
    };
};
