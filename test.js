const passed = 1, total = 11;
const ref = [];
for (let i=0; i<10; i++) ref.push({p: 909, i: 91});
ref.push({p: 910, i: 90});

let missedP = 0, missedI = 0;
for (let i = 0; i < passed; i++) {
    missedP += ref[i].p;
    missedI += ref[i].i;
}

const result = [];
for (let i = passed + 1; i <= total; i++) {
    let refRow = ref[i - 1];
    let pVal = Math.round(refRow.p);
    let iVal = Math.round(refRow.i);

    if (i === passed + 1) {
        pVal = Math.round(pVal + missedP);
        iVal = Math.round(iVal + missedI);
    }
    result.push({p: pVal, i: iVal, total: Math.round(pVal + iVal)});
}

console.log('Result:', result);
const actualTotal = result.reduce((s, x) => s + x.total, 0);
console.log('Actual Total:', actualTotal);

