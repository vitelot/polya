function main() {
  var width = 800,
    height = 600,
    rate = 800, // milliseconds
    rho = 2, // reinforcement
    nu = 1; // adjacent possible

  var runningFlag = true;
  var stream = [];
  var ball = {}; // balls in the stream
  var timer;

// set canvas dimensions //
  d3.select("#simulation")
    .style("width", width + "px")
    .style("height", height + "px");

  d3.select("#buttons")
    .style("height", (height/3-18) + "px");

  d3.select("#graph")
    .style("height", height/3 + "px");

  d3.select("#stream")
    .style("height", height/3 + "px");
///////////////////////////
///// Buttons //////
  d3.select("#pauseB")
    .on("click", pauseSym);

  d3.select("#restartB")
    .on("click", restartSym);
////////////////////
// inputs //
  d3.select("#rhoValue").on("input", function() {
    rho = +this.value;
  });
  d3.select("#nuValue").on("input", function() {
    nu = +this.value;
  });
  d3.select("#rateValue").on("input", function() {
    rate = +this.value;
    clearInterval(timer);
    if(runningFlag) timer = setInterval(run, rate);
  });
////////////

  var svg = d3.select("#simulation").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("mousedown", pauseSym);

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("stroke", "#000");

    var divstreamwidth = parseInt(d3.select("#stream").style("width")),
        divstreamheight= parseInt(d3.select("#stream").style("height")),
        raggio = Math.min(divstreamheight, divstreamwidth)/2;

    var vis = d3.select("#stream")
      .append("svg:svg") //create the SVG element inside the div#stream
      .attr("width", divstreamwidth)           //set the width and height of our visualization (these will be attributes of the <svg> tag
      .attr("height", divstreamheight)
      .append("svg:g")                //make a group to hold our pie chart
      .attr("transform", "translate(" + raggio + "," + raggio + ")");    //move the center of the pie chart from 0, 0 to radius, radius

    var force, node, nodes;
    var tickcounter = 0,
        dictionary = 0,
        idx = 0;

    startup();
    timer = setInterval(run, rate);

  function run() {
    urnDynamics();
    pieDynamics();
  }

  function startup() {

      force = d3.layout.force()
        .size([width, height])
        .nodes([{
          idx: 0,
          x: 0,
          y: 0,
          color: "#FF0000"
        }]) // initialize with 1 node
        .charge(-5)
        .gravity(0.05)
        .on("tick", tick);

      nodes = force.nodes();
      node = svg.selectAll(".node");

      ball[nodes[0].color] = 0; // still not in the stream

    tickcounter = dictionary = idx = 0;
  }

  function urnDynamics() {
    var r = Math.floor(Math.random() * nodes.length), // get a random element
      rcol = nodes[r].color, // pick its color
      index = nodes[r].idx; // and its index
    var i;

    d3.select("#idx_"+index)
      .transition()
        .duration(300)
        .attr('r', 15)
      .transition()
        .duration(300)
        .attr('r', 5);


    tickcounter++;
    // insert rho copies of it in the urn
    for (i = 0; i < rho; i++) {
      idx++;
      r = height * Math.random();
      nodes.push({
        idx: idx, // each ball in the urn gets a unique ID
        x: 0,
        y: r,
        color: rcol
      });
    }

    if (stream.indexOf(rcol) < 0) {
      // it is a new element
      dictionary++;
      // insert nu+1 new colored balls in the urn
      for (i = 0; i <= nu; i++) {

        do {
          var newcol = getRandomColor();
        } while (stream.indexOf(newcol)>=0); // be sure it is a new color
        idx++;
        r = height * Math.random();
        nodes.push({
          idx: idx,
          x: width,
          y: r,
          color: newcol
        });
        ball[newcol] = 0; // still not in the stream
      }
    }

    // insert it in the stream
    stream.push(rcol);
    ball[rcol]++;
    // update info
    d3.select("#graph p")
      .html("stream size: " + tickcounter + "<br/>" +
              "dictionary: " + dictionary);

    node = node.data(nodes);

    node.enter().append("circle")
      .attr("class", function(d) { return "node class_" + d.color.substr(1)})
      .attr("id", function(d) { return "idx_"+d.idx})
      .attr("r", 5)
      .attr("fill", function(d) { return d.color })
      .append("svg:title")
      .text(function(d) { return d.color; });

    force.start();
  }

  function pieDynamics() {
    var piedata = d3.entries(ball);
    var pie = d3.layout.pie()
	     .value(function(d) { return d.value; })(piedata);
    var arc = d3.svg.arc()              //this will create <path> elements for us using arc data
        .innerRadius(30)
        .outerRadius(raggio-10);

    vis.data(piedata); //associate our data with the document

    vis.selectAll("g.slice") //this selects all <g> elements with class slice (there aren't any yet)
      .remove(); // removes all and get ready for replot
    vis.selectAll(".pieTooltip")
      .remove();

    var arcs = vis.selectAll("g.slice")
       .data(pie)  //associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties)
       .enter() //this will create <g> elements for every "extra" data element that should be associated with a selection. The result is creating a <g> for every object in the data array
       .append("svg:g") //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
       .attr("class", "slice") //allow us to style things in the slices (like text)
       .append("svg:path")
       .attr("fill", function(d) { return d.data.key; }) //set the color for each slice to be chosen from the color function defined above
       .attr("d", arc) //this creates the actual SVG path using the associated data (pie) with the arc drawing function
       .on("mouseover", highlight)
       .on("mouseout", downlight)
       .append("svg:title")
       .text(function(d){return d.data.key + ": " + d.data.value;});

  }

  function pauseSym() {
    if (runningFlag) {
      clearInterval(timer);
      runningFlag = false;
    } else {
      timer = setInterval(run, rate);
      runningFlag = true;
    }
  }

  function restartSym() {
    clearInterval(timer);
    runningFlag = true;
    stream = [];
    ball = {};
    d3.selectAll("circle")
      .transition()
        .duration(300)
        .attr('r', 8)
      .transition()
        .duration(2500)
        .attr('r', 0)
        .style('opacity', 0)
      .each('end', function() { // use on() from version 4
          d3.select(this).remove();
        });

    setTimeout(function () {
      d3.selectAll(".node").remove();
      startup();
      timer = setInterval(run, rate);
    }, 2000);

  }

  function tick() {
    node.attr("cx", function(d) {
        return d.x;
      })
      .attr("cy", function(d) {
        return d.y;
      });
  }
}

function highlight(d,i) {
  d3.selectAll(".class_"+d.data.key.substr(1))
    .attr("r", 10);
}
function downlight(d,i) {
  d3.selectAll(".class_"+d.data.key.substr(1))
    .attr("r", 5);
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
