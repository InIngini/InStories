// ================== Логика форматирования (порт с C# Ofform.cs) ==================

let _addTab = true;
let _addParagraph = true;
let _inputText = "";
let _outputText = "";
let _text = [];
let _isDialog = [];
let _numberParagraph = 0;
let _quotes = "прямые";
let _ellipsis = false;
let _spaces = false;

function format(inputData) {
    _addTab = inputData.addTab;
    _addParagraph = inputData.addParagraph;
    _quotes = inputData.quotes || "прямые";
    _ellipsis = !!inputData.ellipsis;
    _spaces = !!inputData.spaces;
    _inputText = inputData.text.replace(/\r/g, "");
    _outputText = "";

    _text = _inputText.split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
    _isDialog = new Array(_text.length).fill(false);

    reading();

    return {
        text: _outputText,
        addTab: _addTab,
        addParagraph: _addParagraph
    };
}

function reading() {
    if (!_text || _text.length === 0) return;

    for (_numberParagraph = 0; _numberParagraph < _text.length; _numberParagraph++) {
        if (_text[_numberParagraph].trim() !== "") {
            _text[_numberParagraph] = _text[_numberParagraph].replace(/^\s+/, "");

            normalizeSceneBreak();
            removeBracketsContent();
            fixSpacing();
            fixEllipsis();
            replaceDashes();
            replaceGuillemotsWithQuotes();
            replaceDashWithTireWithSpace();
            capitalizeFirstLetters();
            finalizeSentences();
            isDialog();
            applyQuoteStyle();

            if (_addParagraph && _numberParagraph > 0
                && _isDialog[_numberParagraph] !== _isDialog[_numberParagraph - 1]) {
                addParagraphSpacing();
            }

            if (_addTab) {
                addTab();
                addCenter();
            } else {
                addParagraphCenter();
            }

            _outputText += _text[_numberParagraph] + "\n";
        }
    }
}

// "---", "* * *", "~~~" и подобные строки превращаются в "***"
function normalizeSceneBreak() {
    const t = _text[_numberParagraph];
    if (/^[*~\-–—―−_=#\s]+$/.test(t) && t.replace(/\s/g, "").length >= 3) {
        _text[_numberParagraph] = "***";
    }
}

function fixSpacing() {
    if (!_spaces) return;
    _text[_numberParagraph] = _text[_numberParagraph]
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\s+([,.!?:;…])/g, "$1");
}

function fixEllipsis() {
    if (!_ellipsis) return;
    _text[_numberParagraph] = _text[_numberParagraph].replace(/\.{3,}/g, "…");
}

// Прямые кавычки -> «ёлочки»: открывающая после пробела, тире или скобки, иначе закрывающая
function applyQuoteStyle() {
    if (_quotes !== "ёлочки") return;
    const s = _text[_numberParagraph];
    let out = "";
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '"') {
            out += (i === 0 || /[\s(\[—-]/.test(s[i - 1])) ? "«" : "»";
        } else {
            out += s[i];
        }
    }
    _text[_numberParagraph] = out;
}

function removeBracketsContent() {
    _text[_numberParagraph] = _text[_numberParagraph].replace(/<.*?>/g, "").trim();
}

function replaceDashes() {
    _text[_numberParagraph] = _text[_numberParagraph]
        .replace(/–/g, "-")
        .replace(/—/g, "-")
        .replace(/―/g, "-")
        .replace(/−/g, "-");
}

function isDialog() {
    if (_text[_numberParagraph].startsWith("—")) {
        _isDialog[_numberParagraph] = true;
    } else {
        _isDialog[_numberParagraph] = false;
    }
}

function replaceDashWithTireWithSpace() {
    if (_text[_numberParagraph].startsWith("-") && !_text[_numberParagraph].startsWith("- ")) {
        _text[_numberParagraph] = "— " + _text[_numberParagraph].substring(1);
    }
    _text[_numberParagraph] = _text[_numberParagraph].replace(/- /g, "— ");
}

function addTab() {
    if (!/\*\*/.test(_text[_numberParagraph]) && !_text[_numberParagraph].startsWith("   \n")) {
        _text[_numberParagraph] = "<tab>" + _text[_numberParagraph];
    }
}

function addCenter() {
    if (/\*\*/.test(_text[_numberParagraph])) {
        _text[_numberParagraph] = `\n<center>${_text[_numberParagraph].replace(/\./g, "")}</center>`;
    }
}

function addParagraphCenter() {
    if (/\*\*/.test(_text[_numberParagraph])) {
        _text[_numberParagraph] = `\n${_text[_numberParagraph].replace(/\./g, "")}\n`;
    }
}

function addParagraphSpacing() {
    if (!/\*\*/.test(_text[_numberParagraph])) {
        if (!(/\*\*/.test(_text[_numberParagraph - 1]) && _isDialog[_numberParagraph])) {
            if (_addTab) {
                _text[_numberParagraph] = "   \n<tab>" + _text[_numberParagraph];
            } else {
                _text[_numberParagraph] = "   \n" + _text[_numberParagraph];
            }
        }
    }
}

function finalizeSentences() {
    const trimmed = _text[_numberParagraph].replace(/\s+$/, "");
    const lastChar = trimmed.length > 0 ? trimmed[trimmed.length - 1] : "";

    if (lastChar === '"') {
        const lastLastChar = trimmed.length > 2
            ? trimmed[trimmed.length - 2]
            : '"';
        if (!isPunctuation(lastLastChar)) {
            _text[_numberParagraph] = trimmed + ".";
        }
    } else {
        if (!isPunctuation(lastChar)) {
            _text[_numberParagraph] = trimmed + ".";
        }
    }
}

function isPunctuation(character) {
    return character === '.' || character === '!' || character === '?' || character === ':' ||
           character === '…' || character === ',' || character === '*';
}

function replaceGuillemotsWithQuotes() {
    _text[_numberParagraph] = _text[_numberParagraph]
        .replace(/“/g, '"')
        .replace(/»/g, '"')
        .replace(/«/g, '"')
        .replace(/”/g, '"');
}

// Сокращения, после которых точка не заканчивает предложение
const ABBREVIATIONS = ["см", "стр", "ул", "им", "др", "пр", "тыс", "руб", "коп", "мин", "сек", "проф", "акад", "гг", "гор", "рис", "табл"];

// После . ! ? (и пробела, закрывающей кавычки, тире) следующая буква становится заглавной
function capitalizeAfterPunctuation() {
    const re = /([.!?]+)(["»”)]*)(\s+)(— )?(["«„“(]*)(\p{Ll})/gu;

    _text[_numberParagraph] = _text[_numberParagraph].replace(re,
        (match, punct, closing, space, dash, opening, letter, offset, whole) => {
            // многоточие: продолжение предложения с маленькой буквы
            if (/^\.{2,}$/.test(punct)) return match;

            // слова автора после реплики: «— Привет! — сказал он»
            if (dash && /[!?]$/.test(punct)) return match;

            // сокращения: «т. е.», «см. рис.»
            if (punct === ".") {
                const word = (whole.slice(0, offset).match(/(\p{L}+)$/u) || [])[1];
                if (word && (word.length === 1 || ABBREVIATIONS.includes(word.toLowerCase()))) {
                    return match;
                }
            }

            return punct + closing + space + (dash || "") + opening + letter.toUpperCase();
        });
}

function capitalizeFirstLetters() {
    if (_text[_numberParagraph].length > 0 &&
        _text[_numberParagraph][0] !== _text[_numberParagraph][0].toUpperCase() &&
        _text[_numberParagraph][0] === _text[_numberParagraph][0].toLowerCase()) {
        _text[_numberParagraph] = _text[_numberParagraph][0].toUpperCase() + _text[_numberParagraph].substring(1);
    }

    if (_text[_numberParagraph].startsWith("— ")) {
        if (_text[_numberParagraph].length > 2 &&
            _text[_numberParagraph][2] === _text[_numberParagraph][2].toLowerCase() &&
            _text[_numberParagraph][2] !== _text[_numberParagraph][2].toUpperCase()) {
            _text[_numberParagraph] = "— " + _text[_numberParagraph][2].toUpperCase() + _text[_numberParagraph].substring(3);
        }
    }

    capitalizeAfterPunctuation();
}

// ================== UI логика ==================

const SETTINGS_KEY = 'instories.settings';
const DRAFT_KEY = 'instories.draft';

function checkedValue(name) {
    const el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
}

function countWords() {
    const text = document.getElementById("myTextarea").value;
    const words = text.split(/\s+/);
    const wordCount = words.filter(word => /[a-zA-Zа-яА-ЯёЁ]/.test(word)).length;
    const charCount = text.length;
    const noSpaces = text.replace(/\s/g, "").length;
    const paragraphs = text.split("\n").filter(line => line.trim() !== "").length;
    const minutes = wordCount === 0 ? 0 : Math.max(1, Math.round(wordCount / 180));

    document.getElementById("wordCount").textContent = "Количество слов: " + wordCount;
    document.getElementById("charCount").textContent = "Количество символов: " + charCount + " / 100 000";
    document.getElementById("extraCount").textContent =
        "Без пробелов: " + noSpaces + ", абзацев: " + paragraphs +
        ", чтение: " + (minutes ? "~" + minutes + " мин" : "—");
}

function formatText() {
    const input = document.getElementById("myTextarea").value;

    if (!input || input.trim() === "") {
        document.getElementById("resultBlock").style.display = "none";
        return;
    }

    const button = document.getElementById("formatBtn");
    if (button.classList.contains("loading")) return;

    // спиннер вместо текста кнопки; пауза нужна, чтобы он успел показаться
    button.classList.add("loading");
    button.setAttribute("aria-busy", "true");

    setTimeout(() => {
        try {
            const data = {
                text: input,
                addTab: checkedValue("OptionT") === "да",
                addParagraph: checkedValue("OptionP") === "да",
                quotes: checkedValue("OptionQ"),
                ellipsis: document.getElementById("optEllipsis").checked,
                spaces: document.getElementById("optSpaces").checked
            };

            const result = format(data);

            document.getElementById("outputTextarea").value = result.text;
            document.getElementById("resultBlock").style.display = "block";
        } finally {
            button.classList.remove("loading");
            button.removeAttribute("aria-busy");
        }
    }, 400);
}

function clearText() {
    document.getElementById("myTextarea").value = "";
    document.getElementById("outputTextarea").value = "";
    document.getElementById("resultBlock").style.display = "none";
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    countWords();
}

function copyToClipboard() {
    const textarea = document.getElementById("outputTextarea");
    textarea.select();
    document.execCommand("copy");

    const message = document.createElement('div');
    message.id = 'copyMessage';
    message.textContent = 'Скопировано в буфер обмена';
    document.body.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, 2000);
}

function downloadText() {
    const text = document.getElementById("outputTextarea").value;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "text.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

// ---- сохранение настроек и черновика ----
function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
            OptionT: checkedValue("OptionT"),
            OptionP: checkedValue("OptionP"),
            OptionQ: checkedValue("OptionQ"),
            ellipsis: document.getElementById("optEllipsis").checked,
            spaces: document.getElementById("optSpaces").checked
        }));
    } catch (e) {}
}

function restoreState() {
    try {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
        if (settings) {
            ["OptionT", "OptionP", "OptionQ"].forEach(name => {
                document.querySelectorAll('input[name="' + name + '"]').forEach(radio => {
                    if (radio.value === settings[name]) radio.checked = true;
                });
            });
            document.getElementById("optEllipsis").checked = !!settings.ellipsis;
            document.getElementById("optSpaces").checked = !!settings.spaces;
        }
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) document.getElementById("myTextarea").value = draft;
    } catch (e) {}
}

let _draftTimer = null;
function saveDraftSoon() {
    clearTimeout(_draftTimer);
    _draftTimer = setTimeout(() => {
        try {
            localStorage.setItem(DRAFT_KEY, document.getElementById("myTextarea").value);
        } catch (e) {}
    }, 400);
}

document.addEventListener('DOMContentLoaded', function () {
    const textarea = document.getElementById('myTextarea');

    restoreState();

    // Лимит символов
    textarea.addEventListener('input', (event) => {
        const value = event.target.value;
        if (value.length > 100000) {
            textarea.value = value.substring(0, 100000);
            alert('Превышен лимит символов (100 000).');
            countWords();
        }
        saveDraftSoon();
    });

    // Ctrl + Enter (или Cmd + Enter) запускает редактирование
    textarea.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            formatText();
        }
    });

    document.getElementById('editorForm').addEventListener('change', saveSettings);

    countWords();
});