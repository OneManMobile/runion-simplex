/* Runion Simplex — the monitor: a typed terminal session, a tiny shell, phosphors, CRT, fullscreen. */
(() => {
  const $ = (id) => document.getElementById(id);
  const mon = $("monitor"), screen = $("screen"), term = $("term");
  const W = (window.RUNION && window.RUNION.weights) || { Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700 };
  const named = Object.fromEntries(Object.entries(W).map(([n, w]) => [w, n]));
  const runes = (t) => (window.RUNION && window.RUNION.runeText ? window.RUNION.runeText(t) : t);
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const span = (cls, t) => `<span class="${cls}">${esc(t)}</span>`;
  // what may reach the screen: ASCII, Latin-1, combining marks (for runic å) and the Runic block
  const clean = (t) => t.replace(/\t/g, "    ").replace(/[^\n\x20-\x7e\xa0-\xff\u0300-\u036f\u16a0-\u16ff]/g, "?");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PROMPT = `${span("u", "ada@runion")}:${span("w", "~/simplex")}$ `;
  const THEMES = ["green", "amber", "paper", "dark"];

  // ── Python, coloured: one regex pass over the raw text, escaping each piece ──
  const PY = /(#.*$)|("""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(def|class|return|for|in|if|elif|else|from|import|as|not|and|or|while|with|lambda|yield|None|True|False)\b|(@\w+)|\b(\d+)\b|\b([A-Za-z_]\w*)(?=\()/gm;
  const py = (src) => {
    let out = "", at = 0;
    for (const m of src.matchAll(PY)) {
      out += esc(src.slice(at, m.index));
      const [, com, str, kw, deco, num, fn] = m;
      out += com ? span("c", com) : str ? span("s", str) : kw ? span("k", kw) : deco ? span("f", deco) : num ? span("n", num) : span("f", fn);
      at = m.index + m[0].length;
    }
    return out + esc(src.slice(at));
  };

  const GRID_PY = `"""A glyph is a list of strokes; a stroke is a list of dots."""
from dataclasses import dataclass

COLS, ROWS = 3, 7            # x 0-2, y 0-6, plus a b below

@dataclass(frozen=True)
class Dot:
    x: int
    y: int

def parse(code: str) -> list[list[Dot]]:
    """'00-16-20 02-22' -> [[Dot(0, 0), Dot(1, 6), ...], ...]"""
    row = lambda c: {"a": -1, "b": -2}.get(c, None)
    return [[Dot(int(p[0]), row(p[1]) or int(p[1])) for p in s.split("-")]
            for s in code.split()]

if __name__ == "__main__":
    for stroke in parse("00-16-20 02-22"):
        print(len(stroke), "dots:", stroke[0], "->", stroke[-1])`;

  const LS = [
    "total 56",
    ["drwxr-xr-x   9 ada  staff   288 Oct  2 09:14 ", "d", "."],
    ["drwxr-xr-x  14 ada  staff   448 Oct  1 18:02 ", "d", ".."],
    ["-rw-r--r--   1 ada  staff    97 Oct  2 09:10 ", "", ".gitignore"],
    ["-rw-r--r--   1 ada  staff  1027 Oct  2 09:12 ", "", "Makefile"],
    ["-rw-r--r--   1 ada  staff  4403 Sep 28 21:40 ", "", "OFL.txt"],
    ["-rw-r--r--   1 ada  staff  1874 Oct  2 09:11 ", "", "dots.c"],
    ["-rw-r--r--   1 ada  staff   612 Oct  2 09:14 ", "", "grid.py"],
    ["drwxr-xr-x   6 ada  staff   192 Oct  2 08:51 ", "d", "sources"],
    ["-rw-r--r--   1 ada  staff   844 Oct  2 09:13 ", "", "test_grid.py"],
  ].map((l) => (typeof l === "string" ? esc(l) : esc(l[0]) + (l[1] ? span("d", l[2] + "/") : esc(l[2])))).join("\n");

  const GITLOG = [
    ["a3f9c21", " (HEAD -> main, origin/main)", " Set lowercase on the short lattice"],
    ["7be04d0", "", " Widen the cell for 80-column terminals"],
    ["41c2e8a", "", " Square nibs: one pen per weight"],
    ["0d9e5b7", "", " Name the grid points xy, column then row"],
    ["e120f3c", "", " Initial dots"],
  ].map(([h, r, m]) => span("h", h) + (r ? span("r", r) : "") + esc(m)).join("\n");

  const MAKE = [
    esc("cc -Wall -O2 -c dots.c -o dots.o"),
    span("hi", "dots.c:42:9: ") + span("r", "warning: ") + esc("unused variable 'pen' [-Wunused-variable]"),
    esc("   42 |     int pen = 76;"),
    esc("      |         ") + span("ok", "^~~"),
    esc("cc -o dots dots.o"),
  ].join("\n");

  const PYTEST = span("ok", "........") + esc("                                     [100%]") + "\n" + span("ok", "8 passed") + esc(" in 0.04s");

  // an ASCII table whose sample column is set in the weight it names
  const table = () => {
    const rule = "+----------+------+------------------+";
    let t = esc(rule) + "\n" + esc("| style    | wght | sample           |") + "\n" + esc(rule) + "\n";
    for (const [name, w] of Object.entries(W))
      t += esc(`| ${name.padEnd(8)} | ${String(w).padStart(4)} | `) +
           `<span style="font-variation-settings:'wght' ${w}">${esc("Il1| O0o {}[] 5S".padEnd(16))}</span>` + esc(" |") + "\n";
    return t + esc(rule) + "\n" + span("dim", `${Object.keys(W).length} rows in set (0.00 sec)`);
  };

  const SESSION = [
    ["ls -la", () => LS],
    ["git log --oneline -5", () => GITLOG],
    ["cat grid.py", () => py(GRID_PY)],
    ["make", () => MAKE],
    ["python3 -m pytest -q", () => PYTEST],
    ["./weights --table", table],
    ['echo "the north wind sings" | runes', () => esc(runes("the north wind sings"))],
  ];

  // ── the screen: committed lines + the live line + a cursor ──
  let buf = "", live = "", input = "", run = 0, busy = false;
  const history = [];
  let hpos = 0;
  const render = () => {
    term.innerHTML = buf + live + esc(input) + '<span class="cursor"></span>';
    term.scrollTop = term.scrollHeight;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  async function play() {
    const me = ++run;
    busy = true; term.classList.add("typing");
    buf = span("dim", "Runion Simplex VT-3x7  -  last login: Fri Oct  2 09:14:07 on ttys001") + "\n";
    live = PROMPT; input = ""; render();
    for (const [cmd, out] of SESSION) {
      await sleep(500);
      for (const ch of cmd) {
        if (me !== run) return;
        input += ch; render();
        await sleep(38 + Math.random() * 70);
      }
      await sleep(260);
      if (me !== run) return;
      buf += live + esc(input) + "\n"; input = "";
      for (const l of out().split("\n")) {              // output arrives line by line, quickly
        if (me !== run) return;
        buf += l + "\n"; live = ""; render();
        await sleep(18);
      }
      live = PROMPT; render();
    }
    finish(me);
  }
  const finish = (me) => {
    if (me !== run) return;
    busy = false; term.classList.remove("typing");
    if (!buf.includes("try ")) buf += span("dim", "# your turn: click here and type - try help") + "\n";
    live = PROMPT; render();
  };
  const skipToEnd = () => {                               // a key during the animation: show the whole session at once
    const me = ++run;
    buf = "";
    for (const [cmd, out] of SESSION) buf += PROMPT + esc(cmd) + "\n" + out() + "\n";
    input = "";
    finish(me);
  };

  // ── the little shell ──
  const COMMANDS = {
    help: () => [
      "commands:",
      "  ls [-la]         list files          cat grid.py     show the source",
      "  git log          recent commits      make            build dots",
      "  pytest           run the tests       table           weights table",
      "  echo TEXT        print TEXT          runes TEXT      TEXT in runes",
      "  chars            the character set   date, whoami    the usual",
      "  theme NAME       green amber paper dark",
      "  size N           12-28               weight N        300-700",
      "  crt on|off       CRT effects         replay          the session again",
      "  fullscreen       for a real screen   clear           clear the screen",
    ].map(esc).join("\n"),
    ls: (a) => (a.includes("-l") ? LS : [span("d", "sources/"), "Makefile", "OFL.txt", "dots.c", "grid.py", "test_grid.py"].join("   ")),
    cat: (a) => (a.trim() === "grid.py" ? py(GRID_PY) : esc(`cat: ${a.trim() || "?"}: No such file or directory`)),
    git: (a) => (a.startsWith("log") ? GITLOG : esc(`git: '${a}' is not a git command here. Try: git log`)),
    make: () => MAKE,
    pytest: () => PYTEST,
    python3: (a) => (a.includes("pytest") ? PYTEST : a.includes("grid.py") ? esc("2 dots: Dot(x=0, y=0) -> Dot(x=2, y=0)\n2 dots: Dot(x=0, y=2) -> Dot(x=2, y=2)") : esc("Python 3.12.6 - but not in this terminal.")),
    table,
    echo: (a) => esc(a.replace(/^["']|["']$/g, "")),
    runes: (a) => esc(runes(a.replace(/^["']|["']$/g, "") || "runion simplex")),
    date: () => esc(new Date().toString().replace(/ \(.*\)$/, "")),
    whoami: () => "ada",
    pwd: () => "/Users/ada/simplex",
    chars: () => {
      let s = "";
      for (let c = 33; c < 127; c++) s += String.fromCharCode(c) + (c % 32 === 0 ? "\n" : "");
      s += "\n";
      for (let c = 0xa1; c <= 0xff; c++) if (c !== 0xad) s += String.fromCharCode(c) + ((c - 0xa0) % 32 === 0 ? "\n" : "");
      return esc(s.replace(/\n+$/, "") + "\n" + runes("the quick brown fox jumps over the lazy dog"));
    },
    theme: (a) => (THEMES.includes(a.trim()) ? (setTheme(a.trim()), "") : esc("theme: green amber paper dark")),
    size: (a) => (+a >= 12 && +a <= 28 ? (setSize(+a), "") : esc("size: 12-28")),
    weight: (a) => (+a >= 300 && +a <= 700 ? (setWeight(+a), "") : esc("weight: 300-700")),
    crt: (a) => (setCrt(a.trim() !== "off"), ""),
    fullscreen: () => (toggleFull(), ""),
  };
  const exec = (line) => {
    const cmdline = line.trim(), [cmd] = cmdline.split(/\s+/), arg = cmdline.slice(cmd.length).trim();
    buf += live + esc(line) + "\n"; input = "";
    if (cmdline) { history.push(cmdline); hpos = history.length; }
    if (cmd === "clear") buf = "";
    else if (cmd === "replay") { play(); return; }
    else if (cmd === "sudo") buf += esc("ada is not in the sudoers file. This incident will be reported.") + "\n";
    else if (cmd && COMMANDS[cmd]) { const o = COMMANDS[cmd](arg); if (o) buf += o + "\n"; }
    else if (cmd) buf += esc(`zsh: command not found: ${cmd}`) + "\n";
    live = PROMPT; render();
  };

  // ── controls ──
  const setTheme = (t) => {
    for (const x of THEMES) mon.classList.toggle("theme-" + x, x === t);
    document.querySelectorAll("[data-theme]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.theme === t));
  };
  const setSize = (px) => { mon.style.setProperty("--fs", px + "px"); $("msize").value = px; $("msizev").textContent = px + " px"; render(); };
  const setWeight = (w) => { mon.style.setProperty("--wg", w); $("mweight").value = w; $("mweightv").textContent = named[w] || w; };
  const setCrt = (on) => { mon.classList.toggle("crt", on); $("crt").checked = on; };
  document.querySelectorAll("[data-theme]").forEach((b) => (b.onclick = () => setTheme(b.dataset.theme)));
  $("msize").oninput = (e) => setSize(+e.target.value);
  $("mweight").oninput = (e) => setWeight(+e.target.value);
  $("crt").onchange = (e) => setCrt(e.target.checked);
  $("replay").onclick = () => { $("mine").value = ""; play(); };
  $("mine").oninput = (e) => {                            // your own text, on the screen as you type
    run++; busy = false; term.classList.remove("typing");
    const t = clean(e.target.value);
    buf = t ? esc(t) + "\n" : ""; live = PROMPT; input = ""; render();
  };

  // ── fullscreen: the real API on the monitor, or a fixed full-window fallback ──
  const isFull = () => document.fullscreenElement === mon || document.webkitFullscreenElement === mon || mon.classList.contains("pseudo-full");
  let hintTimer;
  const hint = () => {
    const h = $("fshint");
    h.classList.add("show"); clearTimeout(hintTimer);
    hintTimer = setTimeout(() => h.classList.remove("show"), 3500);
  };
  const onFull = () => { $("full").textContent = isFull() ? "exit fullscreen" : "fullscreen"; if (isFull()) { hint(); screen.focus(); } render(); };
  function toggleFull() {
    if (isFull()) {
      if (mon.classList.contains("pseudo-full")) { mon.classList.remove("pseudo-full"); onFull(); }
      else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    const req = mon.requestFullscreen || mon.webkitRequestFullscreen;
    const fallback = () => { mon.classList.add("pseudo-full"); onFull(); };
    if (!req) return fallback();
    try { const p = req.call(mon); if (p && p.catch) p.catch(fallback); } catch { fallback(); }
  }
  $("full").onclick = toggleFull;
  document.addEventListener("fullscreenchange", onFull);
  document.addEventListener("webkitfullscreenchange", onFull);

  // ── keyboard: the shell when the screen has focus; Alt+key shortcuts anywhere on the screen ──
  screen.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const act = {
        KeyT: () => setTheme(THEMES[(THEMES.findIndex((t) => mon.classList.contains("theme-" + t)) + 1) % THEMES.length]),
        Equal: () => setSize(Math.min(28, +$("msize").value + 2)), Minus: () => setSize(Math.max(12, +$("msize").value - 2)),
        KeyW: () => setWeight(+$("mweight").value >= 700 ? 300 : Math.round(+$("mweight").value / 100) * 100 + 100),
        KeyC: () => setCrt(!mon.classList.contains("crt")), KeyR: () => play(), KeyF: toggleFull,
      }[e.code];
      if (act) { e.preventDefault(); act(); hint(); }
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.ctrlKey && e.key === "l") { e.preventDefault(); buf = ""; render(); }
      if (e.ctrlKey && e.key === "c" && !busy) { e.preventDefault(); buf += live + esc(input) + "^C\n"; input = ""; render(); }
      return;
    }
    if (e.key === "Escape" && isFull()) { e.preventDefault(); toggleFull(); return; }
    if (busy) { if (e.key.length === 1 || e.key === "Enter") { e.preventDefault(); skipToEnd(); } return; }
    if (e.key === "Enter") { e.preventDefault(); exec(input); }
    else if (e.key === "Backspace") { e.preventDefault(); input = input.slice(0, -1); render(); }
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      hpos = Math.max(0, Math.min(history.length, hpos + (e.key === "ArrowUp" ? -1 : 1)));
      input = history[hpos] || ""; render();
    } else if (e.key.length === 1) { e.preventDefault(); input += clean(e.key); render(); }
  });
  screen.addEventListener("paste", (e) => {
    if (busy) return;
    e.preventDefault();
    input += clean((e.clipboardData.getData("text") || "").split("\n")[0]); render();
  });

  setTheme("green"); setSize(16); setWeight(400);
  // start typing when the monitor first comes into view, unless something already took the screen
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); if (run === 0) play(); } }, { threshold: 0.3 });
    io.observe(mon);
  } else play();
  render();
})();
