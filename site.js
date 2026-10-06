(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;
  function run(f) { try { f(); } catch (e) { if (window.console) console.error(e); } }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // Reveal on scroll. Without an observer, everything is shown at once.
  run(function () {
    var els = document.querySelectorAll(".reveal");
    if (!hasIO || reduced) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  });

  // Loops run only while their section is on screen.
  run(function () {
    var els = document.querySelectorAll(".demo");
    if (!hasIO) { els.forEach(function (el) { el.classList.add("play"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("play", e.isIntersecting); });
    }, { rootMargin: "80px 0px" });
    els.forEach(function (el) { io.observe(el); });
  });

  // The aurora: four jewel tones drifting behind the hero, drawn at a third of the resolution, 24 times a second.
  run(function () {
    var sky = document.getElementById("sky");
    var cv = document.getElementById("aurora");
    var gl = cv && cv.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return;
    var VS = "attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";
    var FS = [
      "#ifdef GL_FRAGMENT_PRECISION_HIGH",
      "precision highp float;",
      "#else",
      "precision mediump float;",
      "#endif",
      "uniform vec2 u_res; uniform float u_t;",
      "float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }",
      "float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);",
      "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }",
      "float fbm(vec2 p) { float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);",
      "  for (int k = 0; k < 4; k++) { v += a * noise(p); p = m * p; a *= 0.5; } return v; }",
      "vec3 aurora(float x) {",
      "  vec3 e = vec3(0.063, 0.725, 0.506); vec3 c = vec3(0.024, 0.714, 0.831); vec3 b = vec3(0.231, 0.357, 1.0); vec3 v = vec3(0.545, 0.361, 0.965);",
      "  x = fract(x) * 4.0;",
      "  if (x < 1.0) return mix(e, c, x); if (x < 2.0) return mix(c, b, x - 1.0); if (x < 3.0) return mix(b, v, x - 2.0); return mix(v, e, x - 3.0); }",
      "void main() {",
      "  vec2 uv = gl_FragCoord.xy / u_res;",
      "  vec2 p = vec2(uv.x * u_res.x / u_res.y, uv.y);",
      "  float t = u_t * 0.05;",
      "  vec2 q = vec2(fbm(p * 1.3 + vec2(0.0, t)), fbm(p * 1.3 + vec2(3.1, -t * 0.8)));",
      "  float f = fbm(p * 1.05 + q * 1.9 + vec2(t * 0.7, -t * 0.35));",
      "  float curtain = 0.5 + 0.5 * sin(p.x * 2.4 + q.y * 4.2 + u_t * 0.13);",
      "  vec3 col = aurora(uv.x * 0.42 + f * 0.75 + u_t * 0.008);",
      "  float glow = pow(f, 1.7) * (0.4 + 0.6 * curtain);",
      "  glow *= smoothstep(0.02, 0.95, uv.y);",
      "  glow *= 0.62 + 0.38 * smoothstep(0.08, 0.75, uv.x);",
      "  vec3 o = vec3(0.027, 0.027, 0.031) + col * glow * 1.05;",
      "  o += (hash(gl_FragCoord.xy + fract(u_t)) - 0.5) / 180.0;",
      "  gl_FragColor = vec4(o, 1.0);",
      "}"
    ].join("\n");
    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = shader(gl.VERTEX_SHADER, VS);
    var fs = shader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, "u_res");
    var uT = gl.getUniformLocation(prog, "u_t");
    var SCALE = 0.35;
    var t = 24, last = 0, drawn = 0, on = false, seen = true;
    function draw() {
      var w = Math.max(2, Math.round(cv.clientWidth * SCALE));
      var h = Math.max(2, Math.round(cv.clientHeight * SCALE));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uT, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function frame(now) {
      if (!on) return;
      if (last) t += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (now - drawn > 40) { drawn = now; draw(); }
      requestAnimationFrame(frame);
    }
    function play() {
      var want = seen && !document.hidden && !reduced;
      if (want && !on) { on = true; last = 0; requestAnimationFrame(frame); }
      if (!want) on = false;
    }
    draw();
    sky.classList.add("gl");
    if (hasIO) new IntersectionObserver(function (e) { seen = e[0].isIntersecting; play(); }).observe(sky);
    document.addEventListener("visibilitychange", play);
    window.addEventListener("resize", function () { if (!on) draw(); });
    cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); on = false; sky.classList.remove("gl"); });
    play();
  });

  // The headline turns through its words (the model, the cell and the call by default); the pane and its card follow.
  run(function () {
    var word = document.getElementById("cycle-word");
    if (!word) return;
    var WORDS = (word.getAttribute("data-words") || "model cell call").split(" ");
    var counter = document.getElementById("cycle-index");
    var pics = document.querySelectorAll("#stack img");
    var chips = document.querySelectorAll(".chip[data-for]");
    var tick = document.getElementById("tick");
    var index = 0;
    function count() {
      if (!tick || reduced) return;
      var from = 66082, to = 66202, start = performance.now() + 500;
      tick.textContent = from.toLocaleString("en-US");
      requestAnimationFrame(function step(now) {
        var k = Math.max(0, Math.min(1, (now - start) / 900));
        k = 1 - Math.pow(1 - k, 3);
        tick.textContent = Math.round(from + (to - from) * k).toLocaleString("en-US");
        if (k < 1) requestAnimationFrame(step);
      });
    }
    function show(name) {
      pics.forEach(function (img) { img.classList.toggle("on", img.getAttribute("data-shot") === name); });
      chips.forEach(function (c) { c.classList.toggle("on", c.getAttribute("data-for") === name); });
      if (name === "model") count();
    }
    async function turn() {
      if (reduced || !word.animate) return;
      await word.animate([
        { opacity: 1, transform: "translateY(0) rotateX(0)", filter: "blur(0)" },
        { opacity: 0, transform: "translateY(-42%) rotateX(26deg)", filter: "blur(5px)" }
      ], { duration: 260, easing: "cubic-bezier(.55,0,1,.45)", fill: "forwards" }).finished;
      index = (index + 1) % WORDS.length;
      word.textContent = WORDS[index];
      if (counter) counter.textContent = pad(index + 1) + " / " + pad(WORDS.length);
      show(WORDS[index]);
      await word.animate([
        { opacity: 0, transform: "translateY(48%) rotateX(-24deg)", filter: "blur(5px)" },
        { opacity: 1, transform: "translateY(0) rotateX(0)", filter: "blur(0)" }
      ], { duration: 430, easing: "cubic-bezier(.16,.85,.16,1)", fill: "forwards" }).finished;
      setTimeout(turn, 3200);
    }
    show(WORDS[0]);
    if (!reduced) setTimeout(turn, 3200);
  });

  // The pane leans toward the pointer, and its card the other way.
  run(function () {
    var stage = document.getElementById("stage");
    var hero = document.querySelector(".hero");
    if (!stage || reduced || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var raf = 0;
    hero.addEventListener("pointermove", function (e) {
      var x = e.clientX / window.innerWidth - 0.5;
      var y = e.clientY / window.innerHeight - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        stage.style.setProperty("--ry", (x * 7).toFixed(2) + "deg");
        stage.style.setProperty("--rx", (y * -5).toFixed(2) + "deg");
        stage.style.setProperty("--cx", (x * -20).toFixed(1) + "px");
        stage.style.setProperty("--cy", (y * -14).toFixed(1) + "px");
      });
    });
    hero.addEventListener("pointerleave", function () {
      ["--rx", "--ry", "--cx", "--cy"].forEach(function (p) { stage.style.removeProperty(p); });
    });
  });

  // The strip holds whole copies of its set, enough that half of it outruns the widest screen.
  run(function () {
    var track = document.getElementById("track");
    if (!track) return;
    var set = Array.prototype.slice.call(track.children);
    var width = 0;
    function fill() {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      track.classList.remove("run");
      while (track.children.length > set.length) track.removeChild(track.lastChild);
      var period = track.scrollWidth;
      if (!period) return;
      var copies = Math.max(1, Math.ceil(width / period));
      for (var c = 1; c < copies * 2; c++) {
        set.forEach(function (el) {
          var k = el.cloneNode(true);
          k.querySelectorAll("img").forEach(function (img) { img.alt = ""; });
          track.appendChild(k);
        });
      }
      track.style.setProperty("--dur", (copies * period / 26).toFixed(1) + "s");
      if (!reduced) track.classList.add("run");
    }
    window.addEventListener("load", function () { width = 0; fill(); });
    window.addEventListener("resize", fill);
    fill();
  });

  // Each carousel (the pane's screens, the web app's): one shot in view, its list says which,
  // and each holds until its line fills. A carousel is the section around a .show-list.
  run(function () {
    document.querySelectorAll(".show-list").forEach(function (list) {
      var root = list.closest("section") || document;
      var tabs = Array.prototype.slice.call(list.querySelectorAll("[role=tab]"));
      var shots = root.querySelectorAll(".show-shots img");
      var cap = root.querySelector(".show-cap");
      var i = 0;
      function pick(n, chosen) {
        i = (n + tabs.length) % tabs.length;
        tabs.forEach(function (t, k) {
          var on = k === i;
          t.classList.toggle("on", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
        });
        shots.forEach(function (img, k) { img.classList.toggle("on", k === i); });
        if (cap) cap.textContent = tabs[i].querySelector(".show-d").textContent;
        if (list.scrollWidth > list.clientWidth) {
          var t = tabs[i];
          list.scrollTo({ left: t.offsetLeft - (list.clientWidth - t.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
        }
        if (chosen) list.classList.add("held");
      }
      tabs.forEach(function (t, k) {
        t.addEventListener("click", function () { pick(k, true); });
        t.querySelector(".show-bar").addEventListener("animationend", function () {
          if (k === i && !list.classList.contains("held")) pick(i + 1);
        });
      });
      list.addEventListener("keydown", function (e) {
        var step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        pick(i + step, true);
        tabs[i].focus();
      });
      if (cap) cap.textContent = tabs[0].querySelector(".show-d").textContent;
    });
  });

  // The flow's paths, drawn between the nodes wherever the layout puts them.
  run(function () {
    var flow = document.getElementById("flow");
    var svg = document.getElementById("flow-svg");
    if (!flow || !svg) return;
    var gate = flow.querySelector(".gate");
    function box(el, o) {
      var r = el.getBoundingClientRect();
      return { l: r.left - o.left, r: r.right - o.left, t: r.top - o.top, b: r.bottom - o.top,
               cx: (r.left + r.right) / 2 - o.left, cy: (r.top + r.bottom) / 2 - o.top };
    }
    function wraps(els) {
      var top = null, more = false;
      els.forEach(function (el) { var y = Math.round(el.offsetTop); if (top === null) top = y; else if (Math.abs(y - top) > 4) more = true; });
      return more;
    }
    function f1(n) { return Math.round(n * 10) / 10; }
    function curve(a, b) {
      var across = Math.max(b.l - a.r, a.l - b.r);
      var down = Math.max(b.t - a.b, a.t - b.b);
      var x1, y1, x2, y2, c;
      if (across > down) {
        var right = b.cx > a.cx;
        x1 = right ? a.r : a.l; y1 = a.cy; x2 = right ? b.l : b.r; y2 = b.cy; c = (x2 - x1) / 2;
        return "M" + f1(x1) + "," + f1(y1) + " C" + f1(x1 + c) + "," + f1(y1) + " " + f1(x2 - c) + "," + f1(y2) + " " + f1(x2) + "," + f1(y2);
      }
      var below = b.cy > a.cy;
      x1 = a.cx; y1 = below ? a.b : a.t; x2 = b.cx; y2 = below ? b.t : b.b; c = (y2 - y1) / 2;
      return "M" + f1(x1) + "," + f1(y1) + " C" + f1(x1) + "," + f1(y1 + c) + " " + f1(x2) + "," + f1(y2 - c) + " " + f1(x2) + "," + f1(y2);
    }
    // Beside the gate, every node gets its own line. Above or below it, a row that
    // wrapped would send lines through its own second row, so the row gets one.
    function own(group, nodes) {
      var g = group.getBoundingClientRect(), c = gate.getBoundingClientRect();
      return g.right <= c.left || g.left >= c.right || !wraps(nodes);
    }
    function draw() {
      var o = flow.getBoundingClientRect();
      if (!o.width) return;
      var into = flow.querySelector(".flow-in"), out = flow.querySelector(".flow-out");
      var srcs = Array.prototype.slice.call(into.querySelectorAll(".node.src"));
      var books = Array.prototype.slice.call(out.querySelectorAll(".node.book"));
      var pairs = [];
      if (own(into, srcs)) srcs.forEach(function (s) { pairs.push([s, gate, "in", "src"]); });
      else pairs.push([into, gate, "in", "src"]);
      if (own(out, books)) books.forEach(function (b) { pairs.push([gate, b, "out", b.getAttribute("data-node")]); });
      else pairs.push([gate, out, "out", "excel sheets"]);
      flow.querySelectorAll(".node.ai").forEach(function (a) { pairs.push([a, gate, "ai", a.getAttribute("data-node")]); });
      svg.setAttribute("viewBox", "0 0 " + f1(o.width) + " " + f1(o.height));
      svg.innerHTML = pairs.map(function (p, k) {
        var d = curve(box(p[0], o), box(p[1], o));
        return '<path class="base ' + p[2] + '" data-node="' + p[3] + '" d="' + d + '"/>' +
               '<path class="comet ' + p[2] + '" data-node="' + p[3] + '" pathLength="1" style="--k:' + k + '" d="' + d + '"/>';
      }).join("");
    }
    function hot(key, on) {
      flow.querySelectorAll('[data-node~="' + key + '"], [data-node="gate"]').forEach(function (n) { n.classList.toggle("hot", on); });
    }
    document.querySelectorAll(".connects article[data-node]").forEach(function (card) {
      var key = card.getAttribute("data-node");
      card.addEventListener("pointerenter", function () { hot(key, true); });
      card.addEventListener("pointerleave", function () { hot(key, false); });
    });
    if ("ResizeObserver" in window) new ResizeObserver(draw).observe(flow);
    window.addEventListener("load", draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();
  });

  // A soft light follows the pointer across the tiles.
  run(function () {
    document.querySelectorAll(".tile, .connects article").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px");
        el.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px");
      });
    });
  });

  // The form at the bottom. With data-endpoint it posts there: as JSON, or, when data-fields
  // maps each field to the endpoint's own name (a Google Form's entry.N), as a form post the
  // browser cannot read back (no-cors). Without an endpoint it opens the visitor's own email app.
  run(function () {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var note = document.getElementById("form-note");
    var to = form.getAttribute("data-to");
    function say(text, kind) { note.textContent = text; note.className = "form-note" + (kind ? " " + kind : ""); }
    if (!form.getAttribute("data-endpoint")) say("Opens your email app with this filled in, addressed to " + to + ".");
    // A door that leads here says who is writing: "I am" is filled in on the way.
    document.querySelectorAll("a[data-role]").forEach(function (a) {
      a.addEventListener("click", function () { if (form.elements.role) form.elements.role.value = a.getAttribute("data-role"); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = null;
      ["name", "email"].forEach(function (n) {
        var el = form.elements[n];
        var ok = el.value.trim() && (n !== "email" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim()));
        el.setAttribute("aria-invalid", ok ? "false" : "true");
        if (!ok && !bad) bad = el;
      });
      if (bad) { bad.focus(); say("Add your name and a work email, so we can write back.", "bad"); return; }
      var role = form.elements.role;
      var fields = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        company: form.elements.company.value.trim(),
        role: role.value ? role.options[role.selectedIndex].text : "-",
        note: form.elements.note.value.trim(),
        page: location.pathname
      };
      var endpoint = form.getAttribute("data-endpoint");
      var map = null;
      try { map = JSON.parse(form.getAttribute("data-fields") || "null"); } catch (err) { map = null; }
      if (endpoint) {
        var sent;
        say("Sending…");
        if (map) {
          var body = new URLSearchParams();
          Object.keys(map).forEach(function (k) { if (fields[k] !== undefined) body.append(map[k], fields[k]); });
          sent = fetch(endpoint, { method: "POST", mode: "no-cors", body: body });
        } else {
          sent = fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(fields) })
            .then(function (r) { if (!r.ok) throw new Error(String(r.status)); });
        }
        sent.then(function () { form.reset(); say("Thanks. One of us will write back.", "ok"); })
          .catch(function () { say("That did not send. Write to " + to + " instead.", "bad"); });
        return;
      }
      var body = [
        "Name: " + fields.name,
        "Email: " + fields.email,
        "Company: " + (fields.company || "-"),
        "I am: " + fields.role,
        "",
        fields.note
      ].join("\n");
      location.href = "mailto:" + to +
        "?subject=" + encodeURIComponent(form.getAttribute("data-subject") + " — " + (fields.company || fields.name)) +
        "&body=" + encodeURIComponent(body);
      say("Your email app should open with this filled in. If it did not, write to " + to + ".", "ok");
    });
  });

  // The header: a reading line, the section you are in, and the city drifting under its copy.
  run(function () {
    var header = document.querySelector("header");
    var bar = document.getElementById("progress");
    // Only the links to a section on this page follow the scroll; a link to another page is left alone.
    var links = Array.prototype.slice.call(document.querySelectorAll('.links a[href^="#"]'));
    var targets = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    var city = document.querySelector(".scene-wide .place");
    var queued = false;
    function update() {
      queued = false;
      var y = window.scrollY;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle("scrolled", y > 8);
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0).toFixed(4) + ")";
      var cur = -1;
      targets.forEach(function (el, k) { if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) cur = k; });
      links.forEach(function (a, k) {
        a.classList.toggle("on", k === cur);
        if (k === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      if (city && !reduced) {
        var r = city.parentElement.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) {
          var p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
          city.style.setProperty("--par", (p * -70).toFixed(1) + "px");
        }
      }
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    update();
  });
})();
