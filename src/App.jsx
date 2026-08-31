import React, { useEffect, useState } from 'react';
import { generateInitialFleet } from './data/initialFleet';
import { Bus, Printer, RotateCcw, Wrench, Truck, CheckCircle2, Trash2 } from 'lucide-react';

const FLEET_STORAGE_KEY = 'frota-g6:fleet';

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [fleet, setFleet] = useState(() => {
    try {
      const savedFleet = window.localStorage.getItem(FLEET_STORAGE_KEY);
      return savedFleet ? JSON.parse(savedFleet) : generateInitialFleet();
    } catch {
      return generateInitialFleet();
    }
  });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [date, setDate] = useState(getCurrentDate);

  useEffect(() => {
    window.localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(fleet));
  }, [fleet]);

  const fleetList = Object.values(fleet);
  const liberados = fleetList.filter(v => v.status === 'LIBERADO');
  const oficina = fleetList.filter(v => v.status === 'OFICINA');
  const externo = fleetList.filter(v => v.status === 'EXTERNO');

  const caioLib = liberados.filter(v => v.modelo === 'CAIO');
  const marcoLib = liberados.filter(v => v.modelo === 'MARCOPOLO');

  const handleUpdate = (prefixo, newStatus, motivo, destino, obs) => {
    setFleet(prev => ({
      ...prev,
      [prefixo]: {
        ...prev[prefixo],
        status: newStatus,
        motivo: newStatus === 'OFICINA' ? motivo : '',
        destino: newStatus === 'EXTERNO' ? destino : '',
        obs: newStatus === 'EXTERNO' ? obs : ''
      }
    }));
    setSelectedVehicle(null);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-black pb-24">
      <header className="bg-brand-black text-white py-4 px-6 shadow-md border-b-4 border-brand-yellow mb-6">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-yellow p-2 rounded-lg text-brand-black">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold uppercase tracking-wider text-white">
                Soltura de Veículos &bull; Garagem G-6
              </h1>
              <p className="text-xs text-brand-yellow font-semibold tracking-wider uppercase">
                Controle Operacional Diário &bull; Frota 50 Carros
              </p>
              <p className="text-xs text-white/80 font-semibold mt-1">
                Data: {new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 no-print">
            <span className="bg-slate-800 border border-slate-700 text-brand-yellow font-bold text-sm px-3 py-1.5 rounded-lg">
              {new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')}
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-brand-yellow text-brand-black hover:bg-brand-yellowDark font-bold px-3 py-1.5 rounded-lg text-sm transition"
            >
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
            <button
              onClick={() => setFleet(generateInitialFleet())}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg text-sm transition border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" /> Restaurar
            </button>
            <button
              onClick={() => {
                const emptyFleet = {};
                const initialFleet = generateInitialFleet();
                Object.keys(initialFleet).forEach(key => {
                  emptyFleet[key] = {
                    ...initialFleet[key],
                    status: 'LIBERADO',
                    motivo: '',
                    destino: '',
                    obs: ''
                  };
                });
                setFleet(emptyFleet);
              }}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-lg text-sm transition border border-red-700"
            >
              <Trash2 className="w-4 h-4" /> Limpar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="flex flex-wrap gap-6 justify-center md:justify-start">
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm text-center">
            <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">Liberados</span>
            <div className="text-lg font-extrabold text-emerald-600 my-0">{liberados.length}</div>
            <span className="text-xs font-semibold text-slate-500">{((liberados.length / 50) * 100).toFixed(0)}%</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm text-center">
            <span className="text-xs font-bold uppercase text-red-600 tracking-wider">Oficina</span>
            <div className="text-lg font-extrabold text-red-600 my-0">{oficina.length}</div>
            <span className="text-xs font-semibold text-slate-500">{((oficina.length / 50) * 100).toFixed(0)}%</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm text-center">
            <span className="text-xs font-bold uppercase text-amber-600 tracking-wider">Serv. Externo</span>
            <div className="text-lg font-extrabold text-amber-600 my-0">{String(externo.length).padStart(2, '0')}</div>
            <span className="text-xs font-semibold text-slate-500">{((externo.length / 50) * 100).toFixed(0)}%</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm text-center">
            <span className="text-xs font-bold uppercase text-blue-900 tracking-wider">Frota Total</span>
            <div className="text-lg font-extrabold text-blue-900 my-0">50</div>
            <span className="text-xs font-semibold text-slate-500">cadastrados</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-extrabold uppercase text-emerald-700 tracking-wide">Veículos Liberados para Operação</h2>
            </div>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full">{liberados.length} Veículos Aptos</span>
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2"><span>&bull; CAIO (2492 a 2511)</span><span>{caioLib.length} veículos</span></div>
            <div className="flex flex-wrap gap-2">{caioLib.map(v => <button key={v.prefixo} onClick={() => setSelectedVehicle(v)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-1.5 rounded-lg text-sm transition transform hover:scale-105">{v.prefixo}</button>)}</div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2"><span>&bull; MARCOPOLO (2512 a 2541)</span><span>{marcoLib.length} veículos</span></div>
            <div className="flex flex-wrap gap-2">{marcoLib.map(v => <button key={v.prefixo} onClick={() => setSelectedVehicle(v)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-1.5 rounded-lg text-sm transition transform hover:scale-105">{v.prefixo}</button>)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3"><div className="flex items-center gap-2"><Wrench className="w-5 h-5 text-red-600" /><h2 className="text-sm font-extrabold uppercase text-red-700 tracking-wide">Oficina / VTR</h2></div><span className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-full">{oficina.length} Veículos</span></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-500 font-bold uppercase"><th className="py-2 px-3">Prefixo</th><th className="py-2 px-3">Modelo</th><th className="py-2 px-3 text-right no-print">Ação</th></tr></thead><tbody className="divide-y divide-slate-100">{oficina.map(v => <tr key={v.prefixo} className="hover:bg-slate-50"><td className="py-2 px-3"><span className="bg-red-50 text-red-700 border border-red-300 font-extrabold px-2 py-0.5 rounded text-xs">{v.prefixo}</span></td><td className="py-2 px-3 font-semibold text-slate-600">{v.modelo}</td><td className="py-2 px-3 text-right no-print"><button onClick={() => setSelectedVehicle(v)} className="text-slate-400 hover:text-brand-black font-bold">Editar</button></td></tr>)}</tbody></table></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3"><div className="flex items-center gap-2"><Truck className="w-5 h-5 text-amber-600" /><h2 className="text-sm font-extrabold uppercase text-amber-700 tracking-wide">Serviço Externo</h2></div><span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full">{String(externo.length).padStart(2, '0')} Veículos</span></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-500 font-bold uppercase"><th className="py-2 px-3">Prefixo</th><th className="py-2 px-3">Destino</th><th className="py-2 px-3 text-right no-print">Ação</th></tr></thead><tbody className="divide-y divide-slate-100">{externo.map(v => <tr key={v.prefixo} className="hover:bg-slate-50"><td className="py-2 px-3"><span className="bg-amber-50 text-amber-700 border border-amber-300 font-extrabold px-2 py-0.5 rounded text-xs">{v.prefixo}</span></td><td className="py-2 px-3 font-semibold text-slate-800">{v.destino}</td><td className="py-2 px-3 text-right no-print"><button onClick={() => setSelectedVehicle(v)} className="text-slate-400 hover:text-brand-black font-bold">Editar</button></td></tr>)}</tbody></table></div>
          </div>
        </div>
      </main>

      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-brand-black mb-4 flex items-center gap-2">Prefixo {selectedVehicle.prefixo} ({selectedVehicle.modelo})</h3>
            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target); handleUpdate(selectedVehicle.prefixo, fd.get('status'), fd.get('motivo'), fd.get('destino'), fd.get('obs')); }} className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Operacional</label><select name="status" defaultValue={selectedVehicle.status} className="w-full border border-slate-300 rounded-lg p-2 text-sm font-semibold"><option value="LIBERADO">Liberado (Pronto para Rodar)</option><option value="OFICINA">Oficina (Manutenção Interna)</option><option value="EXTERNO">Serviço Externo / Operação Fora</option></select></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo (se Oficina)</label><input type="text" name="motivo" defaultValue={selectedVehicle.motivo} className="w-full border border-slate-300 rounded-lg p-2 text-sm" /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destino (se Serviço Externo)</label><input type="text" name="destino" defaultValue={selectedVehicle.destino} className="w-full border border-slate-300 rounded-lg p-2 text-sm" /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label><textarea name="obs" defaultValue={selectedVehicle.obs} className="w-full border border-slate-300 rounded-lg p-2 text-sm" rows="3" /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setSelectedVehicle(null)} className="px-4 py-2 rounded-lg border border-slate-300 font-semibold">Cancelar</button><button type="submit" className="px-4 py-2 rounded-lg bg-brand-black text-white font-bold">Salvar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
