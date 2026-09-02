import React, { useEffect, useState } from 'react';
import { Bus, Printer, Wrench, Truck, CheckCircle2, Trash2, Info, History, X, Lock, LogOut, Camera, RotateCcw } from 'lucide-react';
import { collection, doc, onSnapshot, updateDoc, writeBatch, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from './firebase'; 

const generateInitialFleet = () => {
    const fleet = {};
    for (let i = 2492; i <= 2541; i++) {
        fleet[i.toString()] = {
            prefixo: i.toString(),
            modelo: i <= 2511 ? 'CAIO' : 'MARCOPOLO',
            status: 'LIBERADO',
            motivo: '',
            destino: '',
            obs: ''
        };
    }
    return fleet;
};

const toDateInputValue = (value = new Date()) => {
  const dateValue = value instanceof Date ? value : new Date(value);
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  // ESTADOS DE AUTENTICAÇÃO
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [username, setUsername] = useState(''); // Mudou de email para username
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // ESTADOS DO SISTEMA
  const [fleet, setFleet] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fleetBackup, setFleetBackup] = useState(() => {
    const saved = localStorage.getItem('frota-g6-backup');
    return saved ? JSON.parse(saved) : null;
  });
  const [backupDate, setBackupDate] = useState(() => {
    const saved = localStorage.getItem('frota-g6-backup-date');
    return saved ? new Date(saved) : null;
  });
  const [observationVehicle, setObservationVehicle] = useState(null);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilterDate, setHistoryFilterDate] = useState(() => toDateInputValue());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayDateTime = currentTime.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const currentDate = toDateInputValue(currentTime);

  // Monitora se o usuário está logado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Cria uma variável limpa só com o nome do usuário (Tira o @frota.com)
  const displayUser = user && user.email ? user.email.split('@')[0] : '';

  // Monitora o Banco de Dados
  useEffect(() => {
    if (!user) return; 

    const frotaRef = collection(db, 'frota');
    const unsubscribe = onSnapshot(
      frotaRef,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            const batch = writeBatch(db);
            const initialFleet = generateInitialFleet();
            Object.values(initialFleet).forEach(vehicle => {
              const docRef = doc(db, 'frota', vehicle.prefixo);
              batch.set(docRef, vehicle);
            });
            await batch.commit();
          } catch (error) {
            console.error("Erro ao inicializar frota:", error);
            setLoading(false);
          }
          return;
        }

        const frotaData = {};
        snapshot.forEach(doc => {
          frotaData[doc.id] = doc.data();
        });
        setFleet(frotaData);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar frota:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // FUNÇÃO DE LOGIN COM TRUQUE DO E-MAIL FANTASMA
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      // Pega o que foi digitado, tira espaços, deixa minúsculo e junta com o falso domínio
      const fakeEmail = `${username.trim().toLowerCase()}@frota.com`;
      await signInWithEmailAndPassword(auth, fakeEmail, password);
    } catch {
      setAuthError('Usuário ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // FUNÇÕES DO SISTEMA (Com registro apenas do nome do usuário na auditoria)
  const handleUpdate = async (prefixo, newStatus, motivo, destino, obs) => {
    try {
      const previousFleet = JSON.parse(JSON.stringify(fleet));
      const previousDate = new Date();
      setFleetBackup(previousFleet);
      setBackupDate(previousDate);
      localStorage.setItem('frota-g6-backup', JSON.stringify(previousFleet));
      localStorage.setItem('frota-g6-backup-date', previousDate.toISOString());

      const docRef = doc(db, 'frota', prefixo);
      await updateDoc(docRef, {
        status: newStatus,
        motivo: newStatus === 'OFICINA' ? motivo : '',
        destino: newStatus === 'EXTERNO' ? destino : '',
        obs: newStatus === 'EXTERNO' ? obs : ''
      });

      const historicoRef = collection(db, 'historico_solturas');
      await addDoc(historicoRef, {
        prefixo: prefixo,
        status_novo: newStatus,
        status_anterior: selectedVehicle ? selectedVehicle.status : 'DESCONHECIDO',
        motivo: newStatus === 'OFICINA' ? motivo : '',
        destino: newStatus === 'EXTERNO' ? destino : '',
        obs: newStatus === 'EXTERNO' ? obs : '',
        data_registro: new Date().toISOString(), 
        acao: 'EDICAO_MANUAL',
        usuario: displayUser // Salva apenas o nome limpo no histórico
      });

      setSelectedVehicle(null);
    } catch (error) {
      console.error("Erro ao atualizar veículo e gerar log:", error);
      alert("Erro ao salvar. Verifique a conexão.");
    }
  };

  const handleResetFleet = async () => {
    if(!window.confirm("Isso vai limpar todos os apontamentos de hoje. Tem certeza?")) return;
    try {
      const previousFleet = JSON.parse(JSON.stringify(fleet));
      const previousDate = new Date();
      setFleetBackup(previousFleet);
      setBackupDate(previousDate);
      localStorage.setItem('frota-g6-backup', JSON.stringify(previousFleet));
      localStorage.setItem('frota-g6-backup-date', previousDate.toISOString());

      const batch = writeBatch(db);
      fleetList.forEach(vehicle => {
        const docRef = doc(db, 'frota', vehicle.prefixo);
        batch.update(docRef, { status: 'LIBERADO', motivo: '', destino: '', obs: '' });
      });
      await batch.commit();

      const historicoRef = collection(db, 'historico_solturas');
      await addDoc(historicoRef, {
        acao: 'RESTAURAR_FROTA_GERAL',
        data_registro: new Date().toISOString(),
        detalhe: 'Todos os veículos retornaram para o status LIBERADO',
        usuario: displayUser
      });
    } catch (error) {
      console.error("Erro ao limpar frota:", error);
    }
  };

  const handleRestoreFleet = async () => {
    if (!fleetBackup) {
      alert("Nenhuma soltura anterior disponível para restaurar.");
      return;
    }
    if (!window.confirm("Restaurar a última soltura salva?")) return;

    try {
      const batch = writeBatch(db);
      Object.values(fleetBackup).forEach(vehicle => {
        batch.update(doc(db, 'frota', vehicle.prefixo), vehicle);
      });
      await batch.commit();
      await addDoc(collection(db, 'historico_solturas'), {
        acao: 'RESTAURAR_ULTIMA_SOLTURA',
        data_registro: new Date().toISOString(),
        detalhe: `Última soltura restaurada (${backupDate ? backupDate.toLocaleString('pt-BR') : 'data não informada'})`,
        usuario: displayUser
      });
      setFleetBackup(null);
      setBackupDate(null);
      localStorage.removeItem('frota-g6-backup');
      localStorage.removeItem('frota-g6-backup-date');
    } catch (error) {
      console.error("Erro ao restaurar a última soltura:", error);
      alert("Erro ao restaurar. Verifique a conexão.");
    }
  };

  // Gera uma arte quadrada full-bleed diretamente dos dados da frota.
  const handleDownloadImage = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível criar o contexto gráfico.');

      const colors = {
        bg: '#f8fafc',
        navy: '#0f172a',
        text: '#334155',
        green: '#059669',
        red: '#dc2626',
        amber: '#d97706',
        blue: '#1d4ed8',
        line: '#dbe3ec'
      };
      const roundedRect = (x, y, width, height, radius, fill, stroke) => {
        context.beginPath();
        context.roundRect(x, y, width, height, radius);
        context.fillStyle = fill;
        context.fill();
        if (stroke) {
          context.strokeStyle = stroke;
          context.lineWidth = 2;
          context.stroke();
        }
      };
      const write = (value, x, y, font, color = colors.text, align = 'left') => {
        context.font = font;
        context.fillStyle = color;
        context.textAlign = align;
        context.textBaseline = 'middle';
        context.fillText(String(value), x, y);
      };
      const truncate = (value, maxWidth, font) => {
        const text = String(value || '-');
        context.font = font;
        if (context.measureText(text).width <= maxWidth) return text;
        let shortened = text;
        while (shortened.length > 1 && context.measureText(`${shortened}…`).width > maxWidth) {
          shortened = shortened.slice(0, -1);
        }
        return `${shortened}…`;
      };
      const drawVehicleGrid = (vehicles, x, y, width, color) => {
        const columns = 10;
        const gap = 6;
        const itemWidth = (width - (columns - 1) * gap) / columns;
        vehicles.forEach((vehicle, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          const itemX = x + column * (itemWidth + gap);
          const itemY = y + row * 30;
          roundedRect(itemX, itemY, itemWidth, 24, 5, '#ffffff', color);
          write(vehicle.prefixo, itemX + itemWidth / 2, itemY + 12, '700 15px Arial, sans-serif', color, 'center');
        });
        return y + Math.ceil(vehicles.length / columns) * 30;
      };

      context.fillStyle = colors.bg;
      context.fillRect(0, 0, 1080, 1080);
      context.fillStyle = colors.navy;
      context.fillRect(0, 0, 1080, 150);
      context.fillStyle = '#facc15';
      context.fillRect(0, 146, 1080, 4);
      write('SOLTURA DE VEÍCULOS • GARAGEM G-6', 42, 52, '800 34px Arial, sans-serif', '#ffffff');
      write(`Data da soltura: ${displayDateTime}`, 42, 91, '600 22px Arial, sans-serif', '#ffffff');
      write(`CONTROLE OPERACIONAL • USUÁRIO: ${displayUser}`, 42, 124, '700 17px Arial, sans-serif', '#facc15');

      const cards = [
        ['LIBERADOS', liberados.length, `${((liberados.length / 50) * 100).toFixed(0)}%`, colors.green],
        ['OFICINA', oficina.length, `${((oficina.length / 50) * 100).toFixed(0)}%`, colors.red],
        ['SERV. EXT.', String(externo.length).padStart(2, '0'), `${((externo.length / 50) * 100).toFixed(0)}%`, colors.amber],
        ['TOTAL', 50, 'Frota', colors.blue]
      ];
      const cardGap = 16;
      const cardWidth = (1008 - cardGap * 3) / 4;
      cards.forEach((card, index) => {
        const x = 36 + index * (cardWidth + cardGap);
        roundedRect(x, 174, cardWidth, 118, 12, '#ffffff', colors.line);
        write(card[0], x + cardWidth / 2, 201, '700 17px Arial, sans-serif', card[3], 'center');
        write(card[1], x + cardWidth / 2, 244, '800 42px Arial, sans-serif', card[3], 'center');
        write(card[2], x + cardWidth / 2, 274, '600 16px Arial, sans-serif', '#64748b', 'center');
      });

      const blockX = 36;
      const blockWidth = 1008;
      roundedRect(blockX, 314, blockWidth, 330, 14, '#ffffff', colors.line);
      write(`✓ VEÍCULOS LIBERADOS PARA OPERAÇÃO (${liberados.length} APTOS)`, 58, 345, '800 21px Arial, sans-serif', colors.green);
      context.strokeStyle = '#bbf7d0';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(58, 372);
      context.lineTo(1022, 372);
      context.stroke();
      const caioLiberados = caioLib.sort((a, b) => a.prefixo - b.prefixo);
      const marcoLiberados = marcoLib.sort((a, b) => a.prefixo - b.prefixo);
      write(`CAIO (2492 a 2511) — ${caioLiberados.length} veículos`, 58, 402, '700 16px Arial, sans-serif');
      drawVehicleGrid(caioLiberados, 58, 420, 964, colors.green);
      write(`MARCOPolo (2512 a 2541) — ${marcoLiberados.length} veículos`, 58, 522, '700 16px Arial, sans-serif');
      drawVehicleGrid(marcoLiberados, 58, 540, 964, colors.green);

      roundedRect(blockX, 664, 496, 350, 14, '#ffffff', colors.line);
      write(`OFICINA / VTR (${oficina.length})`, 58, 696, '800 20px Arial, sans-serif', colors.red);
      drawVehicleGrid(oficina.sort((a, b) => a.prefixo - b.prefixo), 58, 724, 452, colors.red);

      roundedRect(548, 664, 496, 350, 14, '#ffffff', colors.line);
      write(`SERVIÇO EXTERNO (${externo.length})`, 570, 696, '800 20px Arial, sans-serif', colors.amber);
      write('PREFIXO', 570, 728, '700 13px Arial, sans-serif', '#64748b');
      write('DESTINO', 650, 728, '700 13px Arial, sans-serif', '#64748b');
      write('OBSERVAÇÃO', 820, 728, '700 13px Arial, sans-serif', '#64748b');
      externo.sort((a, b) => a.prefixo - b.prefixo).slice(0, 10).forEach((vehicle, index) => {
        const y = 758 + index * 25;
        write(vehicle.prefixo, 570, y, '700 16px Arial, sans-serif', colors.amber);
        write(truncate(vehicle.destino, 155, '600 14px Arial, sans-serif'), 650, y, '600 14px Arial, sans-serif');
        write(truncate(vehicle.observacao ?? vehicle.obs, 190, '600 14px Arial, sans-serif'), 820, y, '600 14px Arial, sans-serif');
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Soltura-G6-${currentDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Erro ao gerar imagem", error);
      alert("Erro ao gerar a imagem do relatório.");
    }
  };

  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const historicoRef = collection(db, 'historico_solturas');
      const q = query(historicoRef, orderBy('data_registro', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      
      const logs = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      setHistoryLogs(logs);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // VARIÁVEIS DE FILTRO
  const fleetList = Object.values(fleet);
  const liberados = fleetList.filter(v => v.status === 'LIBERADO');
  const oficina = fleetList.filter(v => v.status === 'OFICINA');
  const externo = fleetList.filter(v => v.status === 'EXTERNO');

  const caioLib = liberados.filter(v => v.modelo === 'CAIO');
  const marcoLib = liberados.filter(v => v.modelo === 'MARCOPOLO');
  
  const caioOfi = oficina.filter(v => v.modelo === 'CAIO');
  const marcoOfi = oficina.filter(v => v.modelo === 'MARCOPOLO');
  const filteredHistoryLogs = historyLogs.filter(log => {
    const logDate = log.data_registro ? toDateInputValue(log.data_registro) : '';
    return logDate === historyFilterDate;
  });


  // === TELA DE CARREGAMENTO INICIAL ===
  if (isAuthChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-bg font-bold text-slate-500">Verificando credenciais...</div>;
  }

  // === TELA DE LOGIN ===
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="bg-white border-t-4 border-brand-yellow rounded-xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="bg-brand-yellow w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Lock className="w-6 h-6 text-brand-black" />
            </div>
            <h1 className="text-xl font-extrabold text-brand-black uppercase tracking-wider m-0">Acesso Restrito</h1>
            <p className="text-xs text-slate-500 font-medium">Garagem G-6 &bull; Controle de Frota</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome de Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-yellow focus:outline-none"
                placeholder="Ex: meuusuario"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Senha de Acesso</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-yellow focus:outline-none"
                placeholder="******"
                required
              />
            </div>
            
            {authError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 text-center font-bold">{authError}</div>}

            <button
              type="submit"
              className="w-full bg-brand-black hover:bg-slate-800 text-brand-yellow font-extrabold py-3 rounded-lg transition tracking-wider uppercase text-sm mt-2"
            >
              Entrar no Sistema
            </button>
          </form>
        </div>
        
        {/* Rodapé da tela de Login */}
        <div className="fixed bottom-4 text-center w-full">
           <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Desenvolvido por Anselmo Silva</span>
        </div>
      </div>
    );
  }

  // === TELA PRINCIPAL (SISTEMA LOGADO) ===
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-bg font-bold text-slate-500">Conectando à Garagem G-6...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-black pb-36 sm:pb-24 font-sans overflow-x-hidden">
      <div id="relatorio-frota" className="bg-brand-bg pb-4">
        {/* Header */}
        <header className="bg-brand-black text-white py-3 px-3 sm:px-4 shadow-md border-b-4 border-brand-yellow mb-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-brand-yellow p-1.5 rounded-md text-brand-black shrink-0">
                <Bus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-baseline gap-x-2 text-base sm:text-lg font-extrabold uppercase tracking-wide sm:tracking-wider text-white m-0 leading-tight">
                  Soltura de Veículos &bull; Garagem G-6
                  <span className="text-white text-[10px] sm:text-xs font-semibold normal-case tracking-normal whitespace-nowrap" aria-label="Data e hora da soltura">
                    Data da soltura: {displayDateTime}
                  </span>
                </h1>
                <p className="text-[10px] text-brand-yellow font-semibold tracking-wide sm:tracking-wider uppercase m-0 leading-tight">
                  Controle Operacional &bull; Usuário: <span className="text-white">{displayUser}</span>
                </p>
              </div>
            </div>

            <div data-html2canvas-ignore="true" className="grid grid-cols-2 gap-2 sm:flex sm:items-center no-print w-full sm:w-auto sm:ml-auto">
              <button
                onClick={handleOpenHistory}
                className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 py-2 sm:py-1 rounded text-xs transition border border-blue-700 min-w-0"
              >
                <History className="w-3.5 h-3.5 shrink-0" /> <span>Histórico</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1 bg-brand-yellow text-brand-black hover:bg-brand-yellowDark font-bold px-2 py-2 sm:py-1 rounded text-xs transition min-w-0"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" /> Imprimir
              </button>
              <button
                onClick={handleDownloadImage}
                className="flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-2 sm:py-1 rounded text-xs transition min-w-[112px] whitespace-nowrap"
              >
                <Camera className="w-3.5 h-3.5 shrink-0" /> <span className="whitespace-nowrap">Gerar Imagem</span>
              </button>
              <button
                onClick={handleResetFleet}
                className="flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-2 py-2 sm:py-1 rounded text-xs transition border border-red-700 min-w-0"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" /> <span>Limpar</span>
              </button>
              {fleetBackup && (
                <button
                  onClick={handleRestoreFleet}
                  className="flex items-center justify-center gap-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-2 py-2 sm:py-1 rounded text-xs transition border border-orange-700 min-w-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" /> <span>Restaurar</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2 py-2 sm:py-1 rounded text-xs transition border border-slate-700 min-w-0 sm:ml-2"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" /> Sair
              </button>
            </div>
          </div>
        </header>

        {/* --- CONTEÚDO PRINCIPAL (MAIN, MODAIS E FOOTER) --- */}
        <main className="max-w-6xl mx-auto px-3 sm:px-4 space-y-4">
        {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-3 w-full">
          <div className="bg-white border border-slate-200 rounded-md px-1 py-1 sm:px-2 sm:py-1.5 shadow-sm text-center min-w-0">
            <span className="text-[8px] sm:text-[10px] font-bold uppercase text-emerald-600 tracking-wide sm:tracking-wider block leading-tight">Liberados</span>
            <div className="text-base sm:text-xl font-extrabold text-emerald-600 leading-tight">{liberados.length}</div>
            <span className="text-[8px] sm:text-[9px] font-semibold text-slate-500 block leading-tight">{((liberados.length / 50) * 100).toFixed(0)}%</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-md px-1 py-1 sm:px-2 sm:py-1.5 shadow-sm text-center min-w-0">
            <span className="text-[8px] sm:text-[10px] font-bold uppercase text-red-600 tracking-wide sm:tracking-wider block leading-tight">Oficina</span>
            <div className="text-base sm:text-xl font-extrabold text-red-600 leading-tight">{oficina.length}</div>
            <span className="text-[8px] sm:text-[9px] font-semibold text-slate-500 block leading-tight">{((oficina.length / 50) * 100).toFixed(0)}%</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-md px-1 py-1 sm:px-2 sm:py-1.5 shadow-sm text-center min-w-0">
            <span className="text-[8px] sm:text-[10px] font-bold uppercase text-amber-600 tracking-wide sm:tracking-wider block leading-tight">Serv. Ext.</span>
            <div className="text-base sm:text-xl font-extrabold text-amber-600 leading-tight">
              {String(externo.length).padStart(2, '0')}
            </div>
            <span className="text-[8px] sm:text-[9px] font-semibold text-slate-500 block leading-tight">{((externo.length / 50) * 100).toFixed(0)}%</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-md px-1 py-1 sm:px-2 sm:py-1.5 shadow-sm text-center min-w-0">
            <span className="text-[8px] sm:text-[10px] font-bold uppercase text-blue-900 tracking-wide sm:tracking-wider block leading-tight">Total</span>
            <div className="text-base sm:text-xl font-extrabold text-blue-900 leading-tight">50</div>
            <span className="text-[8px] sm:text-[9px] font-semibold text-slate-500 block leading-tight">Frota</span>
          </div>
        </div>

        {/* Seção de Liberados */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
          <div className="flex justify-between items-center gap-2 border-b border-slate-100 pb-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <h2 className="text-[11px] sm:text-xs font-extrabold uppercase text-emerald-700 tracking-wide m-0 leading-tight">
                Veículos Liberados para Operação
              </h2>
            </div>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
              {liberados.length} Aptos
            </span>
          </div>

          {caioLib.length > 0 && (
             <div className="mb-3">
               <div className="flex justify-between gap-2 text-[10px] font-bold text-slate-500 mb-1.5">
                 <span>&bull; CAIO (2492 a 2511)</span>
                 <span className="shrink-0">{caioLib.length} veículos</span>
               </div>
               <div className="flex flex-wrap gap-1.5">
                 {caioLib.sort((a,b) => a.prefixo - b.prefixo).map(v => (
                   <button
                     key={v.prefixo}
                     onClick={() => setSelectedVehicle(v)}
                     className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1 rounded text-xs transition transform hover:scale-105"
                   >
                     {v.prefixo}
                   </button>
                 ))}
               </div>
             </div>
          )}

          {marcoLib.length > 0 && (
             <div>
               <div className="flex justify-between gap-2 text-[10px] font-bold text-slate-500 mb-1.5">
                 <span>&bull; MARCOPOLO (2512 a 2541)</span>
                 <span className="shrink-0">{marcoLib.length} veículos</span>
               </div>
               <div className="flex flex-wrap gap-1.5">
                 {marcoLib.sort((a,b) => a.prefixo - b.prefixo).map(v => (
                   <button
                     key={v.prefixo}
                     onClick={() => setSelectedVehicle(v)}
                     className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1 rounded text-xs transition transform hover:scale-105"
                   >
                     {v.prefixo}
                   </button>
                 ))}
               </div>
             </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          
          {/* Oficina */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex justify-between items-center gap-2 border-b border-slate-100 pb-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Wrench className="w-4 h-4 text-red-600 shrink-0" />
                <h2 className="text-xs font-extrabold uppercase text-red-700 tracking-wide m-0">
                  Oficina / VTR
                </h2>
              </div>
              <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                {oficina.length} Veículos
              </span>
            </div>
            
            {oficina.length === 0 ? (
                <div className="text-xs text-slate-400 italic text-center py-2">Nenhum veículo em oficina.</div>
            ) : (
                <>
                  {caioOfi.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] font-bold text-slate-500 mb-1.5">&bull; CAIO</div>
                      <div className="flex flex-wrap gap-1.5">
                        {caioOfi.sort((a,b) => a.prefixo - b.prefixo).map(v => (
                          <div key={v.prefixo} className="relative group">
                              <button
                                onClick={() => setObservationVehicle(v)}
                                className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-extrabold px-2 py-1 rounded text-xs transition transform hover:scale-105"
                              >
                                {v.prefixo} <Info className="w-3 h-3 text-red-400" />
                              </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {marcoOfi.length > 0 && (
                     <div>
                       <div className="text-[10px] font-bold text-slate-500 mb-1.5">&bull; MARCOPOLO</div>
                       <div className="flex flex-wrap gap-1.5">
                         {marcoOfi.sort((a,b) => a.prefixo - b.prefixo).map(v => (
                           <div key={v.prefixo} className="relative group">
                               <button
                                 onClick={() => setObservationVehicle(v)}
                                 className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-extrabold px-2 py-1 rounded text-xs transition transform hover:scale-105"
                               >
                                 {v.prefixo} <Info className="w-3 h-3 text-red-400" />
                               </button>
                           </div>
                         ))}
                       </div>
                     </div>
                  )}
                </>
            )}
          </div>

          {/* Serviço Externo */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex justify-between items-center gap-2 border-b border-slate-100 pb-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                <h2 className="text-xs font-extrabold uppercase text-amber-700 tracking-wide m-0">
                  Serviço Externo
                </h2>
              </div>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                {String(externo.length).padStart(2, '0')} Veículos
              </span>
            </div>
            
            {externo.length === 0 ? (
                <div className="text-xs text-slate-400 italic text-center py-2">Nenhum veículo em serviço externo.</div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                        <th className="py-2 px-2">Prefixo</th>
                        <th className="py-2 px-2">Destino</th>
                        <th className="py-2 px-2">Observação</th>
                        <th className="py-2 px-2 text-right no-print">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {externo.sort((a,b) => a.prefixo - b.prefixo).map(v => (
                        <tr key={v.prefixo} className="hover:bg-slate-50">
                          <td className="py-2 px-2">
                            <span className="bg-amber-50 text-amber-700 border border-amber-300 font-extrabold px-2 py-0.5 rounded text-xs">
                              {v.prefixo}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-semibold text-slate-800">{v.destino}</td>
                          <td className="py-2 px-2 text-slate-600">{v.obs}</td>
                          <td className="py-2 px-2 text-right no-print">
                            <button
                              onClick={() => setSelectedVehicle(v)}
                              className="text-slate-400 hover:text-brand-black font-bold underline"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        </div>
        </main>
      </div>

      {/* Modal de Histórico/Auditoria */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[85vh] min-w-0">
             <div className="flex justify-between items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-brand-black flex items-center gap-2 m-0 leading-tight">
                  <History className="w-4 h-4 text-blue-600 shrink-0" />
                  Auditoria de Status (Últimos 50 eventos)
                </h3>
                <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-red-500 transition">
                  <X className="w-5 h-5" />
                </button>
             </div>

             <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">
                 Filtrar histórico por data
               </label>
               <input
                 type="date"
                 value={historyFilterDate}
                 onChange={e => setHistoryFilterDate(e.target.value)}
                 className="w-full sm:w-auto border border-slate-300 rounded px-2 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
               />
             </div>

             <div className="overflow-auto flex-1 sm:pr-2">
               {loadingHistory ? (
                  <div className="text-center text-xs text-slate-500 py-6 font-bold animate-pulse">Buscando histórico...</div>
               ) : filteredHistoryLogs.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-6 italic">Nenhum evento encontrado para esta data.</div>
               ) : (
                  <table className="w-full min-w-[560px] text-left text-[11px]">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr className="text-slate-500 uppercase tracking-wider">
                        <th className="py-2 px-2 font-extrabold rounded-tl-md">Data e Hora</th>
                        <th className="py-2 px-2 font-extrabold">Ação / Prefixo</th>
                        <th className="py-2 px-2 font-extrabold">Movimentação</th>
                        <th className="py-2 px-2 font-extrabold rounded-tr-md">Motivo/Detalhe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistoryLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-2 font-semibold text-slate-600 whitespace-nowrap">
                            {new Date(log.data_registro).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-2">
                            {log.acao === 'RESTAURAR_FROTA_GERAL' ? (
                              <span className="font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">LIMPEZA GERAL</span>
                            ) : (
                              <span className="font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{log.prefixo}</span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-semibold text-slate-500 whitespace-nowrap">
                            {log.acao === 'RESTAURAR_FROTA_GERAL' ? '-' : (
                              <span>
                                <span className="text-slate-400 line-through">{log.status_anterior}</span> ➔{' '}
                                <span className={log.status_novo === 'OFICINA' ? 'text-red-600' : log.status_novo === 'EXTERNO' ? 'text-amber-600' : 'text-emerald-600'}>{log.status_novo}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-slate-500">
                             {log.motivo || log.destino || log.detalhe || '-'}
                             {log.usuario && <span className="block text-[9px] text-slate-400 mt-0.5 italic text-blue-600 font-bold">Por: {log.usuario}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               )}
             </div>

             <div className="flex justify-end pt-3 border-t border-slate-100 mt-2">
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Fechar
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Observação (Leitura) */}
      {observationVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-5 shadow-2xl">
             <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-extrabold text-brand-black m-0">
                  Prefixo 90{observationVehicle.prefixo} <span className="text-slate-400 font-medium text-xs">({observationVehicle.modelo})</span>
                </h3>
             </div>
             
             <div className="space-y-3 mb-4 text-sm">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Status</span>
                  <span className={`font-bold ${observationVehicle.status === 'OFICINA' ? 'text-red-600' : 'text-amber-600'}`}>
                    {observationVehicle.status}
                  </span>
                </div>
                
                {observationVehicle.status === 'OFICINA' && observationVehicle.motivo && (
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Diagnóstico / Motivo</span>
                    <p className="text-slate-800 m-0">{observationVehicle.motivo}</p>
                  </div>
                )}
             </div>

             <div className="flex justify-between items-center pt-3 border-t border-slate-100">
               <button
                  type="button"
                  onClick={() => {
                      setSelectedVehicle(observationVehicle);
                      setObservationVehicle(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-brand-yellow bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                >
                  Editar Status
                </button>
                <button
                  type="button"
                  onClick={() => setObservationVehicle(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Fechar
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Edição (Gravação) */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-4 sm:p-5 shadow-2xl">
            <h3 className="text-sm sm:text-base font-extrabold text-brand-black mb-4 flex items-center gap-2 leading-tight">
              Editar Status: 90{selectedVehicle.prefixo} ({selectedVehicle.modelo})
            </h3>
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.target);
              handleUpdate(
                selectedVehicle.prefixo,
                fd.get('status'),
                fd.get('motivo'),
                fd.get('destino'),
                fd.get('obs')
              );
            }} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Operacional</label>
                <select
                  name="status"
                  defaultValue={selectedVehicle.status}
                  className="w-full border border-slate-300 rounded p-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-yellow focus:outline-none"
                >
                  <option value="LIBERADO">Liberado (Pronto para Rodar)</option>
                  <option value="OFICINA">Oficina (Manutenção Interna)</option>
                  <option value="EXTERNO">Serviço Externo / Operação Fora</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motivo (se Oficina)</label>
                <input
                  type="text"
                  name="motivo"
                  defaultValue={selectedVehicle.motivo}
                  placeholder="Ex: Vazamento de água..."
                  className="w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-brand-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destino (se Externo)</label>
                <input
                  type="text"
                  name="destino"
                  defaultValue={selectedVehicle.destino}
                  placeholder="Ex: DEODORO..."
                  className="w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-brand-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observação (se Externo)</label>
                <input
                  type="text"
                  name="obs"
                  defaultValue={selectedVehicle.obs}
                  placeholder="Ex: Alinhamento..."
                  className="w-full border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-brand-yellow focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold bg-brand-yellow hover:bg-brand-yellowDark text-brand-black rounded-lg transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer data-html2canvas-ignore="true" className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-brand-black via-brand-black to-slate-900 text-white py-2 px-3 sm:px-4 shadow-2xl border-t border-brand-yellow no-print z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:flex-wrap justify-between items-center gap-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 min-w-0">
            <div className="h-4 w-1 bg-brand-yellow rounded-full"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-200">Desenvolvido por</span>
            <span className="text-xs font-extrabold text-brand-yellow">Anselmo Silva</span>
            <div className="h-4 w-1 bg-brand-yellow rounded-full"></div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="hidden sm:inline text-[14px] font-medium text-slate-400 tracking-wider">© 2026 Todos os direitos reservados</span>
            <span className="text-[14px] font-bold text-slate-400 tracking-widest bg-slate-800 px-2 py-1 rounded-md border border-slate-700">v3.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
