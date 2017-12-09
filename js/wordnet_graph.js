/* 
    Kevin Yang 
    Cal Poly SLO
    CSC 400 with Professor Lubomir Stanchev
    3/14/2017

    wordnet_graph.js
    JavaScript code for the WordNet graph using the Cytoscope.js library.
*/

$(function(){
    var elementArr = [];
    var graph = JSON.parse(graph_str);
    var originHistory = {}

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    function generateNodeRGB(sense, src) {
        var rgb = [];

        if (sense == src) {
            for(var i = 0; i < 3; i++)
                rgb.push(Math.floor(Math.random() * 255));

            return "rgb(" + rgb.join(',') + ")";
        }
        return "rgb(85,85,85)"
    }    

    function getNodeType(sense, src) {
        if (sense == src) {
            return 1.0 // origin
        }
        else {
            return 0.0 // neighbors
        }
    }

    function addNode(sense, src, match, score) {
        if (sense && sense.length > 0) {
            if (originHistory.hasOwnProperty(sense) && sense == src) {
                return true; // node exists. Return true.
            }

            var isSense = /\s/g.test(sense);
            elementArr.push(
                {
                    "data":{
                        "id":sense,
                        "name":sense,
                        "nodeType": getNodeType(sense, src),
                        "query":true,
                        "nodeColor": generateNodeRGB(sense, src),
                        "isSense": isSense.toString(),
                        "score": 0
                    },
                    "group":"nodes",
                    "removed":false,
                    "selected":false,
                    "selectable":true,
                    "locked":false,
                    "grabbed":false,
                    "grabbable":true,
                    "classes":""
                }
            );

            originHistory[sense] = elementArr.length - 1; // set hashmap with index in elementArr of node

            if (src != sense) {
                for (var i = 0; i < elementArr.length; i++) {
                    if (elementArr[i]["data"]["target"] == src) {
                        elementArr.splice(i, 1);
                        break;
                    }
                }

                elementArr.push({"data": { "id": sense + src, "source": src, "target": sense, "label" : match, "score" : score}});
            }
        }

        return false // node doesn't exist to. Return false.
    }

    function addRelativeNodes(originSense) {
        var relatedSenses = graph[originSense];
        if (relatedSenses) {
            for (var i = 0; i < relatedSenses.length; i++) {
                addNode(relatedSenses[i][0], originSense, relatedSenses[i][1], Number.parseFloat(relatedSenses[i][1]));
            }
        }
        return false;
    }

    function createCytoscape(elementArr, nodeStyleArr){
        return cytoscape({
            container: document.getElementById('cy'),
            layout: {
                name: 'spread',
                minDist: 200,
                idealEdgeLength: 300,
                nodeOverlap: 100
            },
            style: nodeStyleArr,
            elements: elementArr
        });
    }

    var nodeStyleArr = [
            {
              selector: "node[isSense = 'true']", 
              css: {
                  'background-color': '#C0D890',
              }
            },
            {
              selector: "node[isSense = 'false']", 
              css: {
                  'background-color': '#D2D2D2',
              }
            },
            {
              "selector":"core",
              "style":{
                "selection-box-color":"#AAD8FF",
                "selection-box-border-color":"#8BB0D0",
                "selection-box-opacity":"0.5"}
            },
            {
              "selector":"node",
              "style":{
                "width":"50",
                "height":"50",
                "content":"data(name)",
                "font-size":"12px",
                "text-valign":"center",
                "text-halign":"center",
                "color":"#000",
                "overlay-padding":"6px",
                "z-index":"10"
              }
            },
            {
              "selector":"node[?attr]",
              "style":{"shape":"rectangle","background-color":"#aaa","text-outline-color":"#aaa","width":"16px","height":"16px","font-size":"6px","z-index":"1"}
            },
            {
              "selector":"node[?query]",
              "style":{"background-clip":"none","background-fit":"contain"}
            },
            {
              "selector":"node:selected",
              "style":{"border-width":"6px","border-color":"#AAD8FF","border-opacity":"0.5","background-color":"#aaa"}
            },
            {
              "selector":"edge",
              "style":{
                "color":"#888", 
                "label": "data(score)", 
                "curve-style":"haystack",
                "haystack-radius":"0.5",
                "line-color":"#bbb",
                "width":"3",
                "overlay-padding":"3px"
              }
            },

            {"selector":"node.unhighlighted","style":{"opacity":"0.2"}},
            {"selector":"edge.unhighlighted","style":{"opacity":"0.05"}},
            {"selector":".highlighted","style":{"z-index":"999999"}},
            {
              "selector":"node.highlighted",
              "style":{
                "border-width":"6px",
                "border-color":"#AAD8FF",
                "border-opacity":"0.5",
                "background-color":"#aaa",
              }
            },
            {"selector":"edge.filtered","style":{"opacity":"0"}},
        ];

    function recurseNodes(that) {
        that.neighborhood('edge').style( { 'line-color' : 'red' }); // change the colors per origin click.
        that.data("nodeColor", generateNodeRGB("", ""));
        addRelativeNodes(that.id());
        normalizeMatches();
        cy = window.cy = createCytoscape(elementArr, nodeStyleArr);
        cy.fit(cy.getElementById(that.id()), 100);
        cy.nodes().on("click", function(){
            elementArr = [];
            originHistory = {};
            addNode(this.id(), this.id(), 0, Number.parseFloat(graph[this.id()][0][1])); // add origin node.
            recurseNodes(this);
        });
    }

    $('#senseSubmit').on("click", function() {
        var inputs = $('#senseForm :input');
        if (inputs[0].value == null) {
            console.log("Word or Sense cannot be empty or null!");
            return false;
        }

        elementArr = [];
        originHistory = {};
        var nodeExists = addNode(inputs[0].value, inputs[0].value, 0, Number.parseFloat(graph[inputs[0].value][0][1])); // add origin node.
        addRelativeNodes(inputs[0].value); // add neighboring nodes.

        var cy = window.cy = createCytoscape(elementArr, nodeStyleArr);
        // If we pick an origin that wasn't an origin before, set it's style as an origin.
        if (nodeExists) {
            var node = cy.getElementById(inputs[0].value);
            node.data("nodeColor", generateNodeRGB("", "")); // empty strings to make sure equality of origin.
            node.data("nodeType", getNodeType("", "")); // empty strings to make sure equality of origin.
        }

        cy.nodes().on("click", function(){
            elementArr = [];
            originHistory = {};
            addNode(this.id(), this.id(), 0, Number.parseFloat(graph[this.id()][0][1])); // add origin node.
            recurseNodes(this);
        });
        return false;
    });

    $("#graphReset").on("click", function(){
        cy.elements().remove();
        elementArr = [];
        originHistory = {};
    });

    $("#fitWindow").on("click", function(){
        cy.fit()
    });

    $("#senseForm").submit(function(e){
        e.preventDefault(e);
        var inputs = $('#senseForm :input');
        elementArr = [];
        originHistory = {};

        if (inputs[0].value == null) {
            console.log("Word or Sense cannot be empty or null!");
            return false;
        }
        if (graph[inputs[0].value]) {
            addNode(inputs[0].value, inputs[0].value, 0, Number.parseFloat(graph[inputs[0].value][0][1]));
            addRelativeNodes(inputs[0].value);

            var cy = window.cy = createCytoscape(elementArr, nodeStyleArr);

            cy.nodes().on("click", function(){
                elementArr = [];
                originHistory = {};
                addNode(this.id(), this.id(), 0, Number.parseFloat(graph[this.id()][0][1])); // add origin node.
                recurseNodes(this);
            });
        }
        else {
            alert("word or sense doesn't exist in graph!");
        }
        return false;
    });

    function normalizeMatches() {
        var matchArr = [];
        var sum = 0;
        for (var i = 0; i < elementArr.length; i++) {
            matchArr.push(Number.parseFloat(elementArr[i]["data"]["score"]));
            sum += Number.parseFloat(elementArr[i]["data"]["score"]);
        }

        var maxMatch = Math.max.apply(null, matchArr);
        var minMatch = Math.min.apply(null, matchArr);
        for (var i = 0; i < elementArr.length; i++) {
            elementArr[i]["data"]["score"] = matchArr[i] / sum;
        }
    }
});