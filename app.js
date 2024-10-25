import * as d3 from "d3";

export async function main() {
  const black = "black";
  const grayBlue = "#8888aa";
  const blue = "#1e9de7";
  const green = "#27b648";
  const red = "#ff455d";
  const yellow = "#f2b600";

  let width = d3.select("#map").node().getBoundingClientRect().width;
  let height = d3.select("#map").node().getBoundingClientRect().height;
  let scale = Math.min(width, height) * 0.38;
  const sensitivity = 75;

  function round(n, d) {
    return parseFloat(n.toFixed(d));
  }

  let projection = d3
    .geoOrthographic()
    .scale(scale)
    .center([0, 0])
    .rotate([50, -30])
    .translate([width / 2, height / 2]);

  let initialScale = projection.scale();
  let path = d3.geoPath().projection(projection);

  let svg = d3
    .select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  let globe = svg
    .append("circle")
    .attr("id", "theGlobe")
    .attr("fill", "#444")
    .style("opacity", 0.8)
    .attr("stroke", "#000")
    .attr("stroke-width", "0.2")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", initialScale);

  /*
globe.call(d3.drag()
  .on('drag', (e) => {
    document.getElementById('theGlobe').classList.add('drag')
  })
  .on('end', (e) => {
    document.getElementById('theGlobe').classList.remove('drag')
  }))
*/

  let posChanged = true;

  function drag(e) {
    posChanged = true;
    const rotate = projection.rotate();
    const k = sensitivity / projection.scale();
    projection.rotate([rotate[0] + e.dx * k, rotate[1] - e.dy * k]);
    path = d3.geoPath().projection(projection);
    svg.selectAll("path").attr("d", path);
  }

  function zoom(e) {
    posChanged = true;
    if (e.transform.k > 0.3) {
      projection.scale(initialScale * e.transform.k);
      path = d3.geoPath().projection(projection);
      svg.selectAll("path").attr("d", path);
      globe.attr("r", projection.scale());
    } else {
      e.transform.k = 0.3;
    }
  }

  // filter, allowing both drag and zoom to work on mobile
  function filter(e) {
    const t = d3.pointers(e, this);
    if (t.length > 1) return true;
    if (e.type === "wheel") return true;
    return false;
  }

  svg
    .call(d3.zoom().on("zoom", zoom).filter(filter))
    .call(d3.drag().on("drag", drag));

  let map = svg.append("g");

  function getMidpoint(p1, p2) {
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  }

  let routes = [];
  let routesChanged = false;
  let data = {};

  async function loadData() {
    const globeInfo = await d3.json("./world.json");
    data = await d3.json("./data.json");

    map
      .append("g")
      .attr("class", "countries")
      .selectAll("path")
      .data(globeInfo.features)
      .enter()
      .append("path")
      .attr("class", (d) => "country_" + d.properties.name.replace(" ", "_"))
      .attr("d", path)
      .attr("fill", "#dddddd")
      .style("stroke", "black")
      .style("stroke-width", 0.2)
      .style("opacity", 0.8);

    const dataCenters = data.dataCenters;

    map.append("g").attr("id", "routes");
    map.append("g").attr("id", "routeLabels");

    map
      .append("g")
      .attr("class", "dataCenters")
      .selectAll("path")
      .data(dataCenters)
      .enter()
      .append("path")
      .attr("class", (d) => d.name)
      .attr("fill", blue)
      .attr("d", (d) => path({ type: "Point", coordinates: d.loc }))
      .style("stroke-width", 0)
      .style("opacity", 0.7)
      .on("click", (e, d) => {
        routes = data.routes[d.name];
        routesChanged = true;
        posChanged = true;
      });

    map
      .append("g")
      .attr("class", "dataCenterLabels")
      .selectAll("text")
      .data(dataCenters)
      .enter()
      .append("text")
      .attr("class", (d) => d.name)
      .attr("fill", "black")
      .attr("x", (d) => projection(d.loc)[0])
      .attr("y", (d) => projection(d.loc)[1] - 19)
      .text((d) => d.name)
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("font-family", "monospace")
      .style("cursor", "default")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle");

    d3.timer(function (elapsed) {
      if (!posChanged) return;
      // for rotation
      //const rotate = projection.rotate()
      //const k = sensitivity / projection.scale()
      //projection.rotate([
      //  // swap if you want automatic rotation
      //  //rotate[0] - 1 * k,
      //  rotate[0],
      //  rotate[1]
      //])
      path = d3.geoPath().projection(projection).pointRadius(12);
      svg.selectAll(".countries").selectAll("path").attr("d", path);
      svg
        .selectAll(".dataCenters")
        .selectAll("path")
        .attr("d", (d) => path({ type: "Point", coordinates: d.loc }));
      svg
        .selectAll(".dataCenterLabels")
        .selectAll("text")
        .attr("x", (d) => projection(d.loc)[0])
        .attr("y", (d) => projection(d.loc)[1] - 19)
        .style("opacity", (d) =>
          path({ type: "Point", coordinates: d.loc }) == undefined ? 0 : 1
        );

      map
        .select("#routes")
        .selectAll("path")
        .data(routes)
        .join(
          (enter) => {
            let p = enter.append("path");
            if (routesChanged) {
              p = p.transition().ease(d3.easeQuadInOut).duration(250);
            }
            return p
              .attr("d", (d) =>
                path({ type: "LineString", coordinates: d.path })
              )
              .attr("stroke-width", 2)
              .attr("stroke", "#444")
              .attr("fill", "#ffffff00")
              .attr("stroke", (d) => {
                if (d.time < 100) return green;
                else if (d.time < 200) return yellow;
                return red;
              })
              .style("opacity", 1);
          },
          (update) => {
            if (routesChanged) {
              return update
                .transition()
                .ease(d3.easeQuadInOut)
                .duration(400)
                .style("opacity", 0)
                .transition()
                .ease(d3.easeQuadInOut)
                .duration(1)
                .attr("d", (d) =>
                  path({ type: "LineString", coordinates: d.path })
                )
                .attr("stroke", (d) => {
                  if (d.time < 100) return green;
                  else if (d.time < 200) return yellow;
                  return red;
                })
                .transition()
                .ease(d3.easeQuadInOut)
                .duration(400)
                .style("opacity", 1);
            }
            return update.attr("d", (d) =>
              path({ type: "LineString", coordinates: d.path })
            );
          },
          (exit) => {
            exit.remove();
          }
        );

      map
        .select("#routeLabels")
        .selectAll("text")
        .data(routes)
        .join(
          (enter) => {
            let p = enter
              .append("text")
              .attr("x", (d) => projection(d.mid)[0])
              .attr("y", (d) => projection(d.mid)[1])
              .text((d) => {
                if (
                  round(d.mid[0], 5) != round(d.path[0][0], 5) ||
                  round(d.mid[1], 5) != round(d.path[0][1], 5)
                ) {
                  return d.time + "ms";
                }
                return "";
              })
              .attr("fill", black)
              .style("font-family", "monospace")
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .style("opacity", (d) =>
                path({ type: "Point", coordinates: d.mid }) == undefined ? 0 : 1
              );
            if (routesChanged) {
              p = p.transition().ease(d3.easeQuadInOut).duration(250);
            }
            return p.style("opacity", 1.0);
          },
          (update) => {
            if (routesChanged) {
              return update
                .transition()
                .ease(d3.easeQuadInOut)
                .duration(400)
                .style("opacity", 0)
                .transition()
                .ease(d3.easeQuadInOut)
                .duration(1)
                .text((d) => {
                  if (
                    round(d.mid[0], 5) != round(d.path[0][0], 5) ||
                    round(d.mid[1], 5) != round(d.path[0][1], 5)
                  ) {
                    return d.time + "ms";
                  }
                  return "";
                })
                .attr("x", (d) => projection(d.mid)[0])
                .attr("y", (d) => projection(d.mid)[1])
                .transition()
                .ease(d3.easeQuadInOut)
                .duration(400)
                .style("opacity", (d) =>
                  path({ type: "Point", coordinates: d.mid }) == undefined
                    ? 0
                    : 1
                );
            }
            return update
              .text((d) => {
                if (
                  round(d.mid[0], 5) != round(d.path[0][0], 5) ||
                  round(d.mid[1], 5) != round(d.path[0][1], 5)
                ) {
                  return d.time + "ms";
                }
                return "";
              })
              .attr("x", (d) => projection(d.mid)[0])
              .attr("y", (d) => projection(d.mid)[1] - 7)
              .style("opacity", (d) =>
                path({ type: "Point", coordinates: d.mid }) == undefined ? 0 : 1
              );
          },
          (exit) => {
            exit.remove();
          }
        );
      routesChanged = false;
      posChanged = false;
    }, 200);
  }

  loadData();

  function updateSize() {
    width = d3.select("#map").node().getBoundingClientRect().width;
    height = d3.select("#map").node().getBoundingClientRect().height;
    scale = Math.min(width, height) * 0.4;
    projection = d3
      .geoOrthographic()
      .scale(scale)
      .center([0, 0])
      .rotate([50, -30])
      .translate([width / 2, height / 2]);
    initialScale = projection.scale();
    path = d3.geoPath().projection(projection).pointRadius(12);
    svg.attr("width", width).attr("height", height);
    globe
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", initialScale);
    posChanged = true;
  }

  window.addEventListener("resize", updateSize);
}
