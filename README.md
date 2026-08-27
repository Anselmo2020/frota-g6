# 🚌 Sistema de Controle Operacional de Frota — Garagem G-6

Aplicação web interativa desenvolvida em **React**, **Vite** e **Tailwind CSS** para o monitoramento diário, gestão de soltura e controle de disponibilidade de frota de transporte coletivo.

---

## 📌 Visão Geral

O sistema digitaliza o quadro operacional físico da garagem, permitindo aos apontadores e gestores de tráfego acompanhar em tempo real o status dos 50 veículos gerenciados, diagnosticar avarias e registrar serviços externos.

### 📊 Regras de Frota & Dimensionamento
* **Frota Total Gerenciada:** 50 veículos
  * **CAIO Apache:** Prefixos `2492` a `2511` (20 veículos)
  * **MARCOPOLO Torino:** Prefixos `2512` a `2541` (30 veículos)
* **Regra de Disponibilidade:** Veículos que não possuem registros de oficina ou serviço externo são classificados automaticamente como **Liberados para Operação**.

---

## ✨ Funcionalidades

- **Dashboard de KPIs em Tempo Real:** Indicadores automáticos de veículos liberados, em manutenção, fora de linha e percentual de disponibilidade da frota.
- **Gestão Rápida com 1 Clique:** Clique em qualquer prefixo para abrir o modal de atualização de status (*Liberado*, *Oficina* ou *Serviço Externo*).
- **Classificação por Carroceria:** Visualização segmentada entre modelos CAIO e MARCOPOLO.
- **Exportação & Impressão:** Layout com suporte a folha de estilo nativa `@media print` para geração de relatórios operacionais em PDF.
- **Responsividade Multiplataforma:** Acesso otimizado para computadores de mesa, tablets e smartphones.

---

## 🛠️ Tecnologias Utilizadas

* **Front-end:** [React.js](https://react.dev/) + [Vite](https://vitejs.dev/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
* **Ícones:** [Lucide React](https://lucide.dev/)
* **Versionamento & Deploy:** Git, GitHub & Vercel

---

## 🚀 Como Executar Localmente

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/SEU_USUARIO/frota-g6.git](https://github.com/SEU_USUARIO/frota-g6.git)
   cd frota-g6
