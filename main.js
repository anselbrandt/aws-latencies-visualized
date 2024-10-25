import "./style.css";
import { main } from "./app.js";

document.querySelector("#app").innerHTML = `
  <div id="map" style="width: 100svw; height: 100svh;"></div>
  <div id="info">
    <div>AWS data center latencies</div>
  </div>
  <div id="legend">
    <div><span class="green">X</span><span> &lt; 100ms</span></div>
    <div><span class="yellow">X</span><span> 100ms - 200ms</span></div>
    <div><span class="red">X</span><span> &gt; 200ms</span></div>
  </div>
  <div id="made">
    Made by <a href="https://benjdd.com">Ben</a>.
    Data scraped from <a href="https://www.cloudping.co/grid/p_50/timeframe/1M">CloudPing</a>.
  </div>
`;

main().catch((error) => console.log(error));
