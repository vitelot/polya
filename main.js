function main() {

  // ── dimensions ───────────────────────────────────────────────
  const simW = 720, simH = 520;
  const MAX_VISUAL = 180;   // cap on balls rendered in the force layout
  const HEAPS_EVERY = 5;    // update Heaps chart every N steps

  // ── parameters (updated by controls) ────────────────────────
  let rho = 2, nu = 1;
  let rate = speedToRate(2); // speed 2 → 800 ms, matches original default

  // ── simulation state ─────────────────────────────────────────
  let running = true, timer;
  let urnCounts = {};          // color → # balls in urn   (math state)
  let streamCounts = {};       // color → # times drawn    (for pie)
  let streamSet = new Set();   // set of colors ever drawn (novelty check)
  let dictionary = 0, n = 0;  // dict size, stream length
  let heapsData = [];          // [[n, D], …]
  let idx = 0;                 // unique visual-ball ID counter
  let nodes = [];              // visual balls for force layout

  // ── simulation SVG ───────────────────────────────────────────
  d3.select("#simulation")
    .style("width", simW + "px")
    .style("height", simH + "px");

  const svg = d3.select("#simulation").append("svg")
    .attr("width", simW).attr("height", simH)
    .on("mousedown", togglePause);

  svg.append("rect").attr("width", simW).attr("height", simH);

  // ── force simulation ─────────────────────────────────────────
  const sim = d3.forceSimulation()
    .force("charge", d3.forceManyBody().strength(-4))
    .force("x", d3.forceX(simW / 2).strength(0.03))
    .force("y", d3.forceY(simH / 2).strength(0.03))
    .alphaDecay(0.02)
    .on("tick", () => {
      svg.selectAll(".node")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

  // ── pie chart ────────────────────────────────────────────────
  const PIE_SIZE = 190, PIE_R = PIE_SIZE / 2;

  const pieG = d3.select("#stream").append("svg")
    .attr("width", PIE_SIZE).attr("height", PIE_SIZE)
    .append("g")
    .attr("transform", `translate(${PIE_R},${PIE_R})`);

  // ── Heaps' law chart ─────────────────────────────────────────
  const hm = { top: 10, right: 14, bottom: 30, left: 38 };
  const hW = 270 - hm.left - hm.right;
  const hH = 130 - hm.top - hm.bottom;

  const heapsSvg = d3.select("#heaps").append("svg")
    .attr("width", hW + hm.left + hm.right)
    .attr("height", hH + hm.top + hm.bottom);
  const heapsG = heapsSvg.append("g")
    .attr("transform", `translate(${hm.left},${hm.top})`);

  let xSc = d3.scaleLog().clamp(true).domain([1, 100]).range([0, hW]);
  let ySc = d3.scaleLog().clamp(true).domain([1, 10]).range([hH, 0]);

  const xAxisG = heapsG.append("g").attr("class", "heaps-axis")
    .attr("transform", `translate(0,${hH})`);
  const yAxisG = heapsG.append("g").attr("class", "heaps-axis");

  heapsG.append("text")
    .attr("x", hW / 2).attr("y", hH + 24)
    .attr("text-anchor", "middle")
    .attr("fill", "#8b949e").attr("font-size", "10px")
    .text("stream size  n");
  heapsG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -hH / 2).attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("fill", "#8b949e").attr("font-size", "10px")
    .text("D(n)");

  const heapsPath = heapsG.append("path")
    .attr("fill", "none")
    .attr("stroke", "#58a6ff")
    .attr("stroke-width", 1.5);

  const theoPath = heapsG.append("path")
    .attr("fill", "none")
    .attr("stroke", "#e3b341")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "5 3");

  // legend (appended last so it renders on top)
  const lgG = heapsG.append("g").attr("transform", `translate(${hW - 74}, 1)`);
  lgG.append("line").attr("x1", 0).attr("x2", 16).attr("y1", 5).attr("y2", 5)
    .attr("stroke", "#58a6ff").attr("stroke-width", 1.5);
  lgG.append("text").attr("x", 19).attr("y", 8)
    .attr("fill", "#8b949e").attr("font-size", "9px").text("observed");
  lgG.append("line").attr("x1", 0).attr("x2", 16).attr("y1", 15).attr("y2", 15)
    .attr("stroke", "#e3b341").attr("stroke-width", 1.5).attr("stroke-dasharray", "5 3");
  lgG.append("text").attr("x", 19).attr("y", 18)
    .attr("fill", "#8b949e").attr("font-size", "9px").text("theory");

  // ── controls ─────────────────────────────────────────────────
  d3.select("#pauseB").on("click", togglePause);
  d3.select("#restartB").on("click", restart);

  d3.select("#rhoValue").on("input", function () { rho = +this.value; updateTheoLabel(); });
  d3.select("#nuValue").on("input", function () { nu = +this.value; updateTheoLabel(); });
  d3.select("#speedValue").on("input", function () {
    const s = +this.value;
    d3.select("#speedDisplay").text(s);
    rate = speedToRate(s);
    if (running) { clearInterval(timer); timer = setInterval(tick, rate); }
  });

  // ── start ────────────────────────────────────────────────────
  startup();
  timer = setInterval(tick, rate);

  // ─────────────────────────────────────────────────────────────

  function tick() {
    stepUrn();
    updatePie();
    if (n % HEAPS_EVERY === 0) updateHeaps();
  }

  function startup() {
    const red = "#FF0000";
    urnCounts = { [red]: 1 };
    streamCounts = {};
    streamSet = new Set();
    dictionary = 0; n = 0; idx = 1;
    heapsData = [];
    nodes = [{ idx: 0, x: simW / 2, y: simH / 2, color: red, vx: 0, vy: 0 }];

    svg.selectAll(".node").remove();
    svg.selectAll(".node")
      .data(nodes, d => d.idx)
      .join(enter => enter.append("circle")
        .attr("class", d => "node class_" + d.color.slice(1))
        .attr("id", d => "idx_" + d.idx)
        .attr("r", 5)
        .attr("fill", d => d.color));

    sim.nodes(nodes).alpha(1).restart();

    pieG.selectAll("path.slice").remove();
    heapsPath.attr("d", null);
    theoPath.attr("d", null);
    xSc.domain([1, 100]); ySc.domain([1, 10]);
    xAxisG.call(d3.axisBottom(xSc).ticks(3, "~s").tickSize(3));
    yAxisG.call(d3.axisLeft(ySc).ticks(3, "~s").tickSize(3));

    d3.select("#stat-stream").text(0);
    d3.select("#stat-dict").text(0);
    d3.select("#stat-beta").text("—");
    updateTheoLabel();
  }

  function stepUrn() {
    const rcol = sampleUrn();

    // pulse a visual ball of the drawn color
    const hits = nodes.filter(nd => nd.color === rcol);
    if (hits.length) {
      const t = hits[Math.floor(Math.random() * hits.length)];
      d3.select("#idx_" + t.idx)
        .transition().duration(220).attr("r", 13)
        .transition().duration(220).attr("r", 5);
    }

    n++;

    // reinforcement: add ρ copies to urn (and to canvas if under cap)
    urnCounts[rcol] += rho;
    for (let i = 0; i < rho; i++) addVisual(rcol, 0, simH * Math.random());

    if (!streamSet.has(rcol)) {
      // novel color: expand adjacent possible
      dictionary++;
      for (let i = 0; i <= nu; i++) {
        const nc = freshColor();
        urnCounts[nc] = 1;
        streamCounts[nc] = 0;
        addVisual(nc, simW, simH * Math.random());
      }
    }

    streamSet.add(rcol);
    streamCounts[rcol] = (streamCounts[rcol] || 0) + 1;
    heapsData.push([n, dictionary]);

    d3.select("#stat-stream").text(n);
    d3.select("#stat-dict").text(dictionary);

    // sync force simulation and DOM
    sim.nodes(nodes).alpha(0.2).restart();

    svg.selectAll(".node")
      .data(nodes, d => d.idx)
      .join(enter => enter.append("circle")
        .attr("class", d => "node class_" + d.color.slice(1))
        .attr("id", d => "idx_" + d.idx)
        .attr("r", 5)
        .attr("fill", d => d.color)
        .call(sel => sel.append("title").text(d => d.color)));
  }

  function addVisual(color, x, y) {
    if (nodes.length >= MAX_VISUAL) return;
    nodes.push({ idx: idx++, x, y, color, vx: x === 0 ? 0.5 : -0.5, vy: 0 });
  }

  // ── pie chart (proper data join — no full remove/re-add) ──────
  function updatePie() {
    const entries = Object.entries(streamCounts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ key, value }));
    if (!entries.length) return;

    const pie = d3.pie().value(d => d.value).sort(null)(entries);
    const arc = d3.arc().innerRadius(26).outerRadius(PIE_R - 8);

    const paths = pieG.selectAll("path.slice")
      .data(pie, d => d.data.key);

    const entered = paths.enter().append("path")
      .attr("class", "slice")
      .attr("fill", d => d.data.key)
      .attr("stroke", "#0d1117").attr("stroke-width", 1)
      .on("mouseover", (_, d) => highlight(d.data.key))
      .on("mouseout",  (_, d) => downlight(d.data.key));
    entered.append("title");

    paths.merge(entered)
      .attr("d", arc)
      .select("title")
      .text(d => `${d.data.key}: ${d.data.value}`);

    paths.exit().remove();
  }

  // ── Heaps' law chart ─────────────────────────────────────────
  function updateHeaps() {
    if (heapsData.length < 3) return;

    xSc.domain([1, Math.max(10, n)]);
    ySc.domain([1, Math.max(3, dictionary)]);
    xAxisG.call(d3.axisBottom(xSc).ticks(3, "~s").tickSize(3));
    yAxisG.call(d3.axisLeft(ySc).ticks(3, "~s").tickSize(3));

    // downsample for rendering performance when many points
    const stride = Math.max(1, Math.floor(heapsData.length / 400));
    const display = heapsData.filter((_, i) => i % stride === 0);

    const line = d3.line()
      .x(d => xSc(d[0])).y(d => ySc(d[1]))
      .defined(d => d[0] > 0 && d[1] > 0);
    heapsPath.datum(display).attr("d", line);

    // ── theoretical curve ──────────────────────────────────────
    if (nu > 0 && heapsData.length >= 5) {
      // shape function f(n); D(n) ≈ C · f(n)
      const f = (nu === rho)
        ? ni => ni / Math.log(ni)          // ν = ρ:  n / ln(n)
        : ni => Math.pow(ni, nu / rho);    // general: n^(ν/ρ)

      // fit constant C via OLS without intercept: C = Σ(D·f) / Σ(f²)
      // skip n = 1 to avoid log(1) = 0 division in the ν = ρ branch
      const pts = heapsData.filter(d => d[0] > 1 && d[1] > 0);
      const num = pts.reduce((s, [ni, Di]) => s + Di * f(ni), 0);
      const den = pts.reduce((s, [ni])     => s + f(ni) * f(ni), 0);
      const C = den > 0 ? num / den : 1;

      const theoData = display
        .filter(d => d[0] > 1)
        .map(([ni]) => [ni, C * f(ni)]);

      theoPath.datum(theoData).attr("d", line);
    } else {
      theoPath.attr("d", null);
    }

    // ── empirical β via log-log OLS ────────────────────────────
    if (heapsData.length >= 10) {
      const pts = heapsData.filter(d => d[0] > 0 && d[1] > 0);
      const m = pts.length;
      const lx = pts.map(d => Math.log(d[0]));
      const ly = pts.map(d => Math.log(d[1]));
      const sx  = lx.reduce((a, b) => a + b, 0);
      const sy  = ly.reduce((a, b) => a + b, 0);
      const sxy = lx.reduce((a, x, i) => a + x * ly[i], 0);
      const sx2 = lx.reduce((a, x) => a + x * x, 0);
      const beta = (m * sxy - sx * sy) / (m * sx2 - sx * sx);
      d3.select("#stat-beta").text(isFinite(beta) ? beta.toFixed(3) : "—");
    }
  }

  function updateTheoLabel() {
    if (nu <= 0) {
      d3.select("#stat-beta-theo").text("—");
    } else if (nu === rho) {
      d3.select("#stat-beta-theo").text("n / ln n");
    } else {
      d3.select("#stat-beta-theo").text((nu / rho).toFixed(3));
    }
  }

  // ── helpers ───────────────────────────────────────────────────

  // weighted random sample from urn
  function sampleUrn() {
    const cols  = Object.keys(urnCounts);
    const total = cols.reduce((s, c) => s + urnCounts[c], 0);
    let r = Math.random() * total;
    for (const c of cols) {
      r -= urnCounts[c];
      if (r <= 0) return c;
    }
    return cols[cols.length - 1]; // floating-point safety fallback
  }

  // generate a hex color not yet in the urn
  function freshColor() {
    let c;
    do { c = randColor(); } while (urnCounts[c]);
    return c;
  }

  function togglePause() {
    if (running) {
      clearInterval(timer); running = false;
      d3.select("#pauseB").text("Resume");
    } else {
      timer = setInterval(tick, rate); running = true;
      d3.select("#pauseB").text("Pause");
    }
  }

  function restart() {
    clearInterval(timer);
    sim.stop();
    running = true;
    d3.select("#pauseB").text("Pause");

    svg.selectAll(".node")
      .transition().duration(300).attr("r", 8)
      .transition().duration(1500).attr("r", 0).style("opacity", 0)
      .on("end", function () { d3.select(this).remove(); });

    setTimeout(() => {
      svg.selectAll(".node").remove();
      startup();
      timer = setInterval(tick, rate);
    }, 2000);
  }
}

// ── highlight balls matching a pie slice on hover ─────────────
function highlight(color) {
  d3.selectAll(".class_" + color.slice(1)).attr("r", 10);
}
function downlight(color) {
  d3.selectAll(".class_" + color.slice(1)).attr("r", 5);
}

// speed 1–8 → delay in ms; speed 2 = 800 ms (original default)
function speedToRate(speed) {
  return Math.round(1600 / speed);
}

function randColor() {
  let c = "#";
  for (let i = 0; i < 6; i++) c += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
  return c;
}
