const DRAFT_KEY = 'instories.draft';
const $ = id => document.getElementById(id);
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = s => s.replace(/ё/g, "е").replace(/Ё/g, "Е");

// служебные слова не считаем частыми (в форме без «ё»)
const STOP = new Set(("этот эта это эти того тому этом этим этой была было были буду будет будто быть все всех всем всего " +
    "есть если когда потом тоже только такой такая такие чтобы него нее ним ними них нас вас вам нам меня тебя тебе себя себе " +
    "очень даже еще уже или либо где там тут здесь который которая которое которые которых которым которой чем что для " +
    "без под над при про через между после перед около был она они его ему ней как так вот ведь именно").split(" "));

const FILLERS = ["просто", "словно", "будто", "как будто", "как бы", "вдруг", "внезапно", "неожиданно", "очень",
    "немного", "слегка", "почти", "вроде", "видимо", "казалось", "наконец", "снова", "опять", "конечно", "вообще",
    "действительно", "фактически", "практически", "собственно", "типа", "в общем", "так сказать", "на самом деле",
    "в принципе", "в целом", "как-то", "довольно", "совсем", "буквально", "прямо", "даже"];

const wordsOf = text => norm(text).toLowerCase().match(/\p{L}+(?:-\p{L}+)*/gu) || [];

function frequent(text, merge) {
    const map = new Map();
    for (const w of wordsOf(text)) {
        if (w.length < 4 || STOP.has(w)) continue;
        const key = merge && w.length >= 6 ? w.slice(0, 5) : w;
        let e = map.get(key);
        if (!e) { e = { count: 0, forms: new Map() }; map.set(key, e); }
        e.count++;
        e.forms.set(w, (e.forms.get(w) || 0) + 1);
    }
    return [...map.values()]
        .filter(e => e.count >= 3)
        .sort((a, b) => b.count - a.count)
        .slice(0, 30)
        .map(e => ({
            label: [...e.forms.entries()].sort((a, b) => b[1] - a[1])[0][0],
            count: e.count,
            forms: [...e.forms.keys()]
        }));
}

function sentenceStarts(text) {
    const out = [];
    for (const para of text.replace(/\r/g, "").split("\n")) {
        for (const s of para.split(/(?<=[.!?…])["»”)]*\s+/)) {
            const m = norm(s).toLowerCase().replace(/^[\s—\-–"«„“(]+/, "").match(/^\p{L}+/u);
            if (m) out.push(m[0]);
        }
    }
    return out;
}

function startStats(text) {
    const starts = sentenceStarts(text);
    const counts = new Map();
    starts.forEach(w => { if (w.length >= 2) counts.set(w, (counts.get(w) || 0) + 1); });
    const top = [...counts.entries()].filter(([, c]) => c >= 4).sort((a, b) => b[1] - a[1]).slice(0, 12)
        .map(([w, c]) => ({ label: w, count: c }));

    const runs = [];
    for (let i = 0; i < starts.length;) {
        let j = i;
        while (j + 1 < starts.length && starts[j + 1] === starts[i]) j++;
        if (j - i + 1 >= 3 && starts[i].length >= 2) runs.push({ word: starts[i], from: i + 1, to: j + 1 });
        i = j + 1;
    }
    return { top, runs };
}

function fillerStats(text) {
    const t = norm(text).toLowerCase();
    const total = Math.max(wordsOf(text).length, 1);
    const res = [];
    for (const f of FILLERS) {
        const re = new RegExp("(?<![\\p{L}])" + reEsc(f) + "(?![\\p{L}])", "gu");
        const count = (t.match(re) || []).length;
        if (count >= 2) res.push({ label: f, count, forms: [f], per: (count * 1000 / total).toFixed(1) });
    }
    return res.sort((a, b) => b.count - a.count);
}

function analyzeText(text, merge) {
    return { freq: frequent(text, merge), starts: startStats(text), fillers: fillerStats(text) };
}

// ---------- интерфейс ----------
let currentText = "";
const registry = [];

function chipButtons(el, items, extra) {
    if (!items.length) { el.innerHTML = '<p class="empty">Ничего не нашлось.</p>'; return; }
    el.innerHTML = items.map(it => {
        registry.push(it.forms);
        return '<button type="button" class="chip" data-k="' + (registry.length - 1) + '">' +
            esc(it.label) + ' <b>' + it.count + '</b>' + (extra ? extra(it) : "") + '</button>';
    }).join("");
}

function analyze() {
    const text = $("src").value;
    if (!text.trim()) { $("results").hidden = true; return; }
    currentText = text;
    registry.length = 0;

    const r = analyzeText(text, $("optMerge").checked);
    chipButtons($("freqList"), r.freq);
    chipButtons($("fillerList"), r.fillers, it => '<small> (' + it.per + ' на 1000)</small>');

    const sl = $("startList");
    sl.innerHTML = r.starts.top.length
        ? r.starts.top.map(it => '<span class="chip">' + esc(it.label) + ' <b>' + it.count + '</b></span>').join("")
        : '<p class="empty">Ничего не нашлось.</p>';
    $("runList").innerHTML = r.starts.runs.map(run =>
        '<li>«' + esc(run.word) + '» — ' + (run.to - run.from + 1) + ' предложения подряд (№ ' + run.from + '–' + run.to + ')</li>').join("");

    $("previewWrap").hidden = true;
    $("results").hidden = false;
}

function showHighlight(forms) {
    const n = norm(currentText);
    const re = new RegExp("(?<![\\p{L}])(?:" + forms.map(reEsc).join("|") + ")(?![\\p{L}])", "giu");
    let out = "", last = 0, m;
    while ((m = re.exec(n))) {
        out += esc(currentText.slice(last, m.index)) + "<mark>" + esc(currentText.slice(m.index, m.index + m[0].length)) + "</mark>";
        last = m.index + m[0].length;
    }
    out += esc(currentText.slice(last));
    const box = $("previewBox");
    box.innerHTML = out;
    $("previewWrap").hidden = false;
    const first = box.querySelector("mark");
    if (first) box.scrollTop = Math.max(0, first.offsetTop - box.clientHeight / 2);
}

function clearAll() {
    $("src").value = "";
    $("results").hidden = true;
}

function fromEditor() {
    let draft = "";
    try { draft = localStorage.getItem(DRAFT_KEY) || ""; } catch (e) {}
    if (!draft) { alert("В редакторе пока нет сохранённого черновика."); return; }
    $("src").value = draft;
}

document.addEventListener("DOMContentLoaded", () => {
    $("results").addEventListener("click", e => {
        const chip = e.target.closest("button.chip");
        if (!chip) return;
        const wasActive = chip.classList.contains("active");
        document.querySelectorAll("button.chip.active").forEach(c => c.classList.remove("active"));
        if (wasActive) { $("previewWrap").hidden = true; return; }
        chip.classList.add("active");
        showHighlight(registry[+chip.dataset.k]);
    });
});
