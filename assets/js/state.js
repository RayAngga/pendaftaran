import { LS_REGS } from "./config.js";
function load(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def }catch{ return def; } }
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
export const state = { admin:false, regs:load(LS_REGS, []), current:null, scanTimer:null };
export function saveRegs(){ save(LS_REGS, state.regs); }
export function clearRegs(){ localStorage.removeItem(LS_REGS); state.regs=[]; saveRegs(); }
