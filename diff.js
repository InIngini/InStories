const $ = id => document.getElementById(id);
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const countWords = s => (s.match(/[\p{L}\p{N}]+/gu) || []).length;
const lines = t => t.replace(/\r/g, "").split("\n").map(s => s.trim()).filter(Boolean);
const tokens = s => s.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu) || [];

// наибольшая общая подпоследовательность: общее начало и конец срезаем, остальное считаем таблицей
function diffSeq(a, b) {
    let s = 0;
    while (s < a.length && s < b.length && a[s] === b[s]) s++;
    let ea = a.length, eb = b.length;
    while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    const A = a.slice(s, ea), B = b.slice(s, eb), n = A.length, m = B.length;
    const ops = [];
    for (let i = 0; i < s; i++) ops.push({ t: "eq", v: a[i] });

    if (n * m > 16e6) {
        A.forEach(v => ops.push({ t: "del", v }));
        B.forEach(v => ops.push({ t: "ins", v }));
    } else {
        const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
        for (let i = n - 1; i >= 0; i--)
            for (let j = m - 1; j >= 0; j--)
                dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        let i = 0, j = 0;
        while (i < n && j < m) {
            if (A[i] === B[j]) { ops.push({ t: "eq", v: A[i] }); i++; j++; }
            else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ t: "del", v: A[i++] });
            else ops.push({ t: "ins", v: B[j++] });
        }
        while (i < n) ops.push({ t: "del", v: A[i++] });
        while (j < m) ops.push({ t: "ins", v: B[j++] });
    }
    for (let i = ea; i < a.length; i++) ops.push({ t: "eq", v: a[i] });
    return ops;
}

function wordDiff(x, y) {
    const ops = diffSeq(tokens(x), tokens(y));
    const fixed = [];
    ops.forEach((op, i) => {
        // пробел между двумя правками становится частью правки, чтобы они не дробились
        if (op.t === "eq" && /^\s+$/.test(op.v) && i > 0 && i < ops.length - 1 &&
            ops[i - 1].t !== "eq" && ops[i + 1].t !== "eq") {
            fixed.push({ t: "del", v: op.v }, { t: "ins", v: op.v });
        } else fixed.push(op);
    });
    const segs = [];
    let cur = null;
    for (const op of fixed) {
        if (op.t === "eq") { cur = null; segs.push({ eq: op.v }); }
        else {
            if (!cur) { cur = { del: "", ins: "" }; segs.push(cur); }
            cur[op.t] += op.v;
        }
    }
    return segs;
}

const renderSegs = segs => segs.map(s => "eq" in s ? esc(s.eq) :
    (s.del ? "<del>" + esc(s.del) + "</del>" : "") + (s.ins ? "<ins>" + esc(s.ins) + "</ins>" : "")).join("");

function buildDiff(oldText, newText) {
    const ops = diffSeq(lines(oldText), lines(newText));
    const out = [];
    const st = { added: 0, removed: 0, changed: 0 };

    const removedP = v => { out.push('<p class="dp removed"><del>' + esc(v) + "</del></p>"); st.removed += countWords(v); };
    const addedP = v => { out.push('<p class="dp added"><ins>' + esc(v) + "</ins></p>"); st.added += countWords(v); };

    for (let i = 0; i < ops.length;) {
        if (ops[i].t === "eq") { out.push('<p class="dp same">' + esc(ops[i].v) + "</p>"); i++; continue; }
        const dels = [], inss = [];
        while (i < ops.length && ops[i].t !== "eq") (ops[i].t === "del" ? dels : inss).push(ops[i++].v);

        let d = 0, n = 0;
        while (d < dels.length && n < inss.length) {
            const segs = wordDiff(dels[d], inss[n]);
            const same = segs.reduce((k, s) => k + ("eq" in s ? countWords(s.eq) : 0), 0);
            if (same / Math.max(countWords(dels[d]), countWords(inss[n]), 1) >= 0.3) {
                out.push('<p class="dp changed">' + renderSegs(segs) + "</p>");
                st.changed++;
                segs.forEach(s => { if (!("eq" in s)) { st.removed += countWords(s.del); st.added += countWords(s.ins); } });
                d++; n++;
            } else removedP(dels[d++]);
        }
        while (d < dels.length) removedP(dels[d++]);
        while (n < inss.length) addedP(inss[n++]);
    }
    return { html: out.join(""), stats: st };
}

function compare() {
    const a = $("oldText").value, b = $("newText").value;
    if (!a.trim() && !b.trim()) { $("diffResult").hidden = true; return; }
    const { html, stats } = buildDiff(a, b);
    $("diffOut").innerHTML = html;
    $("diffStats").textContent = "Добавлено слов: " + stats.added + ", удалено: " + stats.removed +
        ", изменённых абзацев: " + stats.changed;
    $("diffResult").hidden = false;
}

function swapTexts() {
    const a = $("oldText"), b = $("newText");
    [a.value, b.value] = [b.value, a.value];
    if (!$("diffResult").hidden) compare();
}

function clearAll() {
    $("oldText").value = "";
    $("newText").value = "";
    $("diffResult").hidden = true;
}

document.addEventListener("DOMContentLoaded", () => {
    $("optOnly").addEventListener("change", e => $("diffOut").classList.toggle("only-changes", e.target.checked));
});
