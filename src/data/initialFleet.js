export const generateInitialFleet = () => {
  const fleet = {};

  // CAIO: 2492 a 2511 (20 veículos)
  for (let i = 2492; i <= 2511; i++) {
    fleet[i] = { prefixo: i, modelo: 'CAIO', status: 'LIBERADO', motivo: '', destino: '', obs: '' };
  }

  // MARCOPOLO: 2512 a 2541 (30 veículos)
  for (let i = 2512; i <= 2541; i++) {
    fleet[i] = { prefixo: i, modelo: 'MARCOPOLO', status: 'LIBERADO', motivo: '', destino: '', obs: '' };
  }

  // Snapshot inicial (26/08/2026)
  const updates = [
    { prefixo: 2493, status: 'EXTERNO', destino: 'CORTE DEODORO', obs: 'Alinhamento' },
    { prefixo: 2495, status: 'EXTERNO', destino: 'DEODORO', obs: 'Serviço externo programado' },
    { prefixo: 2499, status: 'EXTERNO', destino: 'DEODORO', obs: 'Serviço externo programado' },
    { prefixo: 2501, status: 'OFICINA', motivo: 'Vazamento de água pela janela 1º e 2º vagão' },
    { prefixo: 2502, status: 'OFICINA', motivo: 'Tampa do motor solta' },
    { prefixo: 2507, status: 'OFICINA', motivo: 'Limpeza geral' },
    { prefixo: 2508, status: 'OFICINA', motivo: 'Avaria / Monitor sem configuração' },
    { prefixo: 2512, status: 'OFICINA', motivo: 'Lubrificação' },
    { prefixo: 2515, status: 'OFICINA', motivo: 'Revisão de garantia' },
    { prefixo: 2516, status: 'OFICINA', motivo: 'Serviço de elétrica' },
    { prefixo: 2517, status: 'OFICINA', motivo: 'Avaria / Monitor sem configuração' },
    { prefixo: 2524, status: 'OFICINA', motivo: 'Avaria / Monitor sem configuração' },
    { prefixo: 2526, status: 'OFICINA', motivo: 'Trilho da 3ª porta' },
    { prefixo: 2528, status: 'OFICINA', motivo: 'Lubrificação' },
    { prefixo: 2531, status: 'OFICINA', motivo: 'Avaria / Monitor sem configuração' },
    { prefixo: 2533, status: 'OFICINA', motivo: 'Lubrificação' },
    { prefixo: 2537, status: 'OFICINA', motivo: 'Câmera de ré' }
  ];

  updates.forEach(item => {
    fleet[item.prefixo] = { ...fleet[item.prefixo], ...item };
  });

  return fleet;
};