// Interfaces
interface CalculationResult {
    report: string;
    chocks: string;
    actual: string;
    max: string;
    status: string;
}

// State Management
let landings: number = 1;
let lastResult: Partial<CalculationResult> = {};
let displayFormat: 'HH:MM' | 'DEC' = 'HH:MM';
let activeInputId: string = '';

// DOM Elements
const hWheel = document.getElementById('hoursWheel') as HTMLElement;
const mWheel = document.getElementById('minsWheel') as HTMLElement;
const particleContainer = document.getElementById('pickerParticles') as HTMLElement;
const reportInput = document.getElementById('reportTime') as HTMLInputElement;
const chocksInput = document.getElementById('chocksOn') as HTMLInputElement;

// Initialization
(function initTheme() {
    const hour = new Date().getHours();
    if (hour < 6 || hour >= 18) document.documentElement.classList.add('dark');
})();

function initWheel(container: HTMLElement, count: number): void {
    container.innerHTML = '<div style="height:75px"></div>';
    for (let i = 0; i < count; i++) {
        const d = document.createElement('div');
        d.className = 'digit';
        d.textContent = i.toString().padStart(2, '0');
        container.appendChild(d);
    }
    container.innerHTML += '<div style="height:75px"></div>';
}

initWheel(hWheel, 24);
initWheel(mWheel, 60);

// Core Logic Functions
const tToD = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h + (m / 60);
};

const formatValue = (d: number): string => {
    if (displayFormat === 'DEC') return d.toFixed(2);
    const totalMins = Math.round(d * 60);
    const hh = Math.floor(totalMins / 60);
    const mm = totalMins % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const calculate = (): void => {
    if (!reportInput.value || !chocksInput.value) return;

    const s = tToD(reportInput.value);
    let rawE = tToD(chocksInput.value);
    let e = rawE < s ? rawE + 24 : rawE;

    // WOCL Validation
    const inWoclRange = (t: number) => (t >= 2.0 && t <= 6.0);
    if (inWoclRange(s) && inWoclRange(rawE)) {
        document.getElementById('errorModal')?.classList.add('active');
        return;
    }

    const resultsDiv = document.getElementById('results');
    resultsDiv?.classList.remove('hidden');

    const actualFDP = e - s;
    const baseLimits: Record<number, number> = { 1: 13, 2: 13, 3: 12.5, 4: 12, 5: 11.5, 6: 11 };
    const baseFDP = baseLimits[landings];

    // Penalty logic
    let penalty = 0;
    if (s >= 2.0 && s <= 6.0) {
        penalty = Math.min(Math.min(e, 6.0) - s, 2.0);
    } else {
        let overlap = Math.max(0, Math.min(e, 6.0) - Math.max(s, 2.0)) + 
                      Math.max(0, Math.min(e, 30.0) - Math.max(s, 26.0));
        if (overlap > 0) penalty = Math.floor(Math.round(overlap * 60) / 2) / 60;
    }

    const allowed = baseFDP - penalty;
    const isLegal = actualFDP <= (allowed + 0.0001);

    // Update UI
    (document.getElementById('resActual') as HTMLElement).innerText = formatValue(actualFDP);
    (document.getElementById('resMax') as HTMLElement).innerText = formatValue(allowed);
    (document.getElementById('resBase') as HTMLElement).innerText = formatValue(baseFDP);
    
    const pEl = document.getElementById('resPenalty') as HTMLElement;
    pEl.innerText = penalty > 0 ? `-${formatValue(penalty)}` : formatValue(penalty);
    pEl.className = penalty > 0 ? "font-bold text-lg mono text-red-500" : "font-bold text-lg mono";

    // Update Status Box
    const statusTitle = document.getElementById('statusTitle') as HTMLElement;
    statusTitle.innerText = isLegal ? "Legal" : "Illegal";

    lastResult = {
        report: reportInput.value,
        chocks: chocksInput.value,
        actual: formatValue(actualFDP),
        max: formatValue(allowed),
        status: isLegal ? "✅ LEGAL" : "❌ ILLEGAL"
    };
};

// Event Listeners and UI Handlers
document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
});

document.getElementById('lndPlus')?.addEventListener('click', () => {
    if (landings < 6) { landings++; updateLndUI(); }
});

document.getElementById('lndMinus')?.addEventListener('click', () => {
    if (landings > 1) { landings--; updateLndUI(); }
});

function updateLndUI() {
    (document.getElementById('landingsCount') as HTMLElement).innerText = landings.toString();
    calculate();
}

// Sharing
document.getElementById('shareBtn')?.addEventListener('click', async () => {
    const text = `✈️ FDTL REPORT\nReport: ${lastResult.report}\nChocks: ${lastResult.chocks}\nActual: ${lastResult.actual}\nMax Allowed: ${lastResult.max}\nVerdict: ${lastResult.status}`;
    if (navigator.share) await navigator.share({ title: 'FDTL Report', text });
    else { navigator.clipboard.writeText(text); alert("Report Copied!"); }
});

// Modal Logic
const openPicker = (id: string) => {
    activeInputId = id;
    document.getElementById('timePickerModal')?.classList.add('active');
    const val = (document.getElementById(id) as HTMLInputElement).value || "12:00";
    const [h, m] = val.split(':').map(Number);
    hWheel.scrollTop = h * 50;
    mWheel.scrollTop = m * 50;
};

document.getElementById('reportTimeGroup')?.addEventListener('click', () => openPicker('reportTime'));
document.getElementById('chocksOnGroup')?.addEventListener('click', () => openPicker('chocksOn'));
document.getElementById('confirmTimeBtn')?.addEventListener('click', () => {
    const h = Math.round(hWheel.scrollTop / 50);
    const m = Math.round(mWheel.scrollTop / 50);
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    (document.getElementById(activeInputId) as HTMLInputElement).value = timeStr;
    document.getElementById('timePickerModal')?.classList.remove('active');
    calculate();
});
