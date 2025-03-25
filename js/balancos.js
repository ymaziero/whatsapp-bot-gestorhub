// Variável para armazenar os dados da API
let balanceData = null;
let lastFetchedMonth = null; // Para rastrear o último mês em que os dados foram buscados

// Função para abrir/fechar o filtro
function toggleFilter() {
    const filterSection = document.getElementById('filterSection');
    filterSection.style.display = filterSection.style.display === 'none' ? 'block' : 'none';
}

// Função para abrir o modal
document.getElementById('pay-subscription').addEventListener('click', function() {
    fetchBalanceData();
});

// Função para fechar o modal
function closeModal() {
    document.getElementById('balanceModal').style.display = 'none';
}

// Função para buscar os dados da API
function fetchBalanceData() {
    fetch('php/balancos.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                balanceData = data;
                lastFetchedMonth = new Date().getMonth(); // Atualiza o último mês buscado
                const modal = document.getElementById('balanceModal');
                modal.style.display = 'flex'; // Usa flex para centralizar
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                updateModalContent(); // Exibe os dados
            } else {
                alert('Erro ao carregar os dados: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao carregar os dados.');
        });
}

// Função para ajustar o texto dentro das barras com base no tamanho da tela
function adjustBarText(text) {
    const screenWidth = window.innerWidth;
    if (screenWidth <= 480) {
        return text.length > 20 ? text.substring(0, 17) + '...' : text;
    } else if (screenWidth <= 768) {
        return text.length > 30 ? text.substring(0, 27) + '...' : text;
    }
    return text;
}

// Função para atualizar o conteúdo do modal com base no filtro selecionado
function updateModalContent() {
    const filterSelect = document.getElementById('filterSelect');
    const modalContent = document.getElementById('modalContent');
    const selectedOption = filterSelect.value;

    modalContent.innerHTML = ''; // Limpa o conteúdo anterior

    const currentDate = new Date();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    switch (selectedOption) {
        case 'last90days':
            const vendas = balanceData.vendas.map(venda => parseFloat(venda.replace('.', '').replace(',', '.')));
            const categorias = [
                monthNames[currentDate.getMonth()], // Mês atual
                monthNames[currentDate.getMonth() - 1 >= 0 ? currentDate.getMonth() - 1 : 12 + (currentDate.getMonth() - 1)], // Mês anterior
                monthNames[currentDate.getMonth() - 2 >= 0 ? currentDate.getMonth() - 2 : 12 + (currentDate.getMonth() - 2)] // Mês anterior ao anterior
            ];

            const totalVendas = vendas.reduce((sum, valor) => sum + valor, 0);
            const formattedTotal = new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(totalVendas);

            modalContent.innerHTML = `
                <h3>Desempenho de Vendas</h3>
                ${categorias.map((categoria, index) => {
                    const valor = vendas[index];
                    const formattedValue = valor > 0 ? new Intl.NumberFormat('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }).format(valor) : '0,00';
                    return `
                        <div class="bar-container">
                            <div class="bar-label">${adjustBarText(categoria)}</div>
                            <div class="bar ${valor > 0 ? '' : 'no-sales'}">
                                ${valor > 0 ? `R$ ${formattedValue}` : 'Não há vendas no período'}
                            </div>
                        </div>
                    `;
                }).join('')}
                <div class="total">Total: R$ ${formattedTotal}</div>
            `;
            addBarClickEvent(); // Adiciona eventos de clique às barras
            break;

        case 'entradas':
            modalContent.innerHTML = `
                <h3>Entradas</h3>
                ${Object.keys(balanceData.entradas_por_metodo).map(metodo => {
                    const valor = balanceData.entradas_por_metodo[metodo];
                    let nomeMetodo = metodo.charAt(0).toUpperCase() + metodo.slice(1);
                    if (nomeMetodo === 'Cartao_debito') nomeMetodo = 'Cartão (Débito)';
                    if (nomeMetodo === 'Cartao_credito') nomeMetodo = 'Cartão (Crédito)';
                    return `
                        <div class="bar-container">
                            <div class="bar-label">${adjustBarText(nomeMetodo)}</div>
                            <div class="bar">
                                R$ ${valor.toFixed(2).replace('.', ',')}
                            </div>
                        </div>
                    `;
                }).join('')}
                <div class="total">Total: R$ ${balanceData.total_entradas}</div>
            `;
            break;

        case 'topProducts':
            modalContent.innerHTML = `
                <h3>Produtos Mais Vendidos</h3>
                ${balanceData.produtos_mais_vendidos.map(produto => `
                    <div class="bar-container">
                        <div class="bar-label">${adjustBarText(produto.nome)}</div>
                        <div class="bar">
                            ${produto.quantidade} un - R$ ${produto.valor_total}
                        </div>
                    </div>
                `).join('')}
            `;
            break;

        case 'leastProducts':
            modalContent.innerHTML = `
                <h3>Produtos Menos Vendidos</h3>
                ${balanceData.produtos_menos_vendidos.map(produto => `
                    <div class="bar-container">
                        <div class="bar-label">${adjustBarText(produto.nome)}</div>
                        <div class="bar">
                            ${produto.quantidade} un - R$ ${produto.valor_total}
                        </div>
                    </div>
                `).join('')}
            `;
            break;

        case 'totalKg':
            console.log('Total KG:', balanceData.total_kg_acai_sorvete_mes);
            const totalKgStr = balanceData.total_kg_acai_sorvete_mes.replace(' kg', '').replace(',', '.');
            const totalKg = parseFloat(totalKgStr);
            console.log('Total KG Parsed:', totalKg);
            const maxBarWidth = 300; // Largura máxima da barra em pixels
            const barWidth = totalKg > 0 ? (totalKg / 50) * maxBarWidth : 0; // Escala: 50 kg = largura máxima

            modalContent.innerHTML = `
                <h3>Total de KG Vendidos</h3>
                <div class="bar-container">
                    <div class="bar-label">Açaí/Sorvete KG (Mês Atual)</div>
                    <div class="bar" style="width: ${barWidth > maxBarWidth ? maxBarWidth : barWidth}px; min-width: 50px;">
                        ${totalKg > 0 ? balanceData.total_kg_acai_sorvete_mes : '0 kg'}
                    </div>
                </div>
            `;
            break;
    }
}

// Função para exibir o gráfico de linha detalhado
function showLineChart(monthIndex) {
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = ''; // Limpa o conteúdo anterior

    // Ajusta o tamanho do modal para evitar barras de rolagem
    const modal = document.getElementById('balanceModal');
    modal.style.width = '90%';
    modal.style.height = '80%';
    modal.style.maxWidth = '1200px';
    modal.style.maxHeight = '700px';

    // Filtra as movimentações do mês selecionado
    const transactions = balanceData.movimentacoes_por_dia.filter(transaction => {
        const transactionDate = new Date(transaction.dia);
        const currentMonth = new Date();
        currentMonth.setMonth(currentMonth.getMonth() - monthIndex);
        return transactionDate.getMonth() === currentMonth.getMonth() && transactionDate.getFullYear() === currentMonth.getFullYear();
    });

    if (!transactions || transactions.length === 0) {
        modalContent.innerHTML = '<p>Não há movimentações para este mês.</p>';
        return;
    }

    // Criação do container do gráfico
    const chartContainer = document.createElement('div');
    chartContainer.id = 'lineChartContainer';
    chartContainer.style.position = 'relative';
    chartContainer.style.width = '100%';
    chartContainer.style.height = '100%';
    chartContainer.style.marginTop = '20px';
    chartContainer.style.overflow = 'hidden';

    // Adiciona o gráfico ao modal
    modalContent.appendChild(chartContainer);

    // Determina os valores máximos e mínimos para escalonar o gráfico
    const maxValue = Math.max(...transactions.map(t => parseFloat(t.total_vendas)));
    const minValue = Math.min(...transactions.map(t => parseFloat(t.total_vendas)));
    const chartHeight = chartContainer.offsetHeight; // Altura do gráfico em pixels
    const chartWidth = chartContainer.offsetWidth; // Largura do gráfico
    const pointRadius = 6; // Raio dos pontos no gráfico

    // Criação da linha e pontos do gráfico
    const pathData = [];
    transactions.forEach((transaction, index) => {
        const xPosition = (index / (transactions.length - 1)) * chartWidth;
        const yPosition = chartHeight - ((parseFloat(transaction.total_vendas) - minValue) / (maxValue - minValue)) * chartHeight;

        // Adiciona os pontos ao caminho da linha
        pathData.push({ x: xPosition, y: yPosition });

        // Criação do ponto
        const point = document.createElement('div');
        point.style.position = 'absolute';
        point.style.width = `${pointRadius * 2}px`;
        point.style.height = `${pointRadius * 2}px`;
        point.style.backgroundColor = '#00A3E0';
        point.style.borderRadius = '50%';
        point.style.left = `${xPosition - pointRadius}px`;
        point.style.top = `${yPosition - pointRadius}px`;
        point.style.cursor = 'pointer';
        point.style.boxShadow = '0 0 8px rgba(0, 163, 224, 0.6)';

        // Criação do popup hover
        const hoverPopup = document.createElement('div');
        hoverPopup.style.position = 'absolute';
        hoverPopup.style.backgroundColor = '#fff';
        hoverPopup.style.border = '1px solid #ccc';
        hoverPopup.style.borderRadius = '5px';
        hoverPopup.style.padding = '10px';
        hoverPopup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        hoverPopup.style.fontSize = '12px';
        hoverPopup.style.color = '#333';
        hoverPopup.style.display = 'none';
        hoverPopup.style.zIndex = '10';
        hoverPopup.innerHTML = `
            <strong>Data:</strong> ${transaction.dia}<br>
            <strong>Total Vendas:</strong> R$ ${parseFloat(transaction.total_vendas).toFixed(2)}<br>
            <strong>Transações:</strong> ${transaction.total_transacoes}<br>
            <strong>Dinheiro:</strong> ${transaction.dinheiro}<br>
            <strong>Pix:</strong> ${transaction.pix}<br>
            <strong>Cartão Débito:</strong> ${transaction.cartao_debito}<br>
            <strong>Cartão Crédito:</strong> ${transaction.cartao_credito}
        `;

        // Adiciona eventos de hover
        point.addEventListener('mouseenter', () => {
            hoverPopup.style.display = 'block';
            hoverPopup.style.left = `${xPosition + 10}px`;
            hoverPopup.style.top = `${yPosition - 50}px`;
        });

        point.addEventListener('mouseleave', () => {
            hoverPopup.style.display = 'none';
        });

        // Adiciona o ponto e o popup ao gráfico
        chartContainer.appendChild(point);
        chartContainer.appendChild(hoverPopup);
    });

    // Criação da linha curva
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const curvePath = pathData.reduce((acc, point, index, array) => {
        if (index === 0) {
            return `M${point.x},${point.y}`;
        }
        const prev = array[index - 1];
        const midX = (prev.x + point.x) / 2;
        const midY = (prev.y + point.y) / 2;
        return `${acc} Q${prev.x},${prev.y} ${midX},${midY}`;
    }, '');

    path.setAttribute('d', `${curvePath} T${pathData[pathData.length - 1].x},${pathData[pathData.length - 1].y}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#00A3E0');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    chartContainer.appendChild(svg);
}

// Adiciona evento de clique nas barras do gráfico de 90 dias
function addBarClickEvent() {
    const barContainers = document.querySelectorAll('.bar-container');
    barContainers.forEach((bar, index) => {
        bar.addEventListener('click', () => {
            showLineChart(index); // Exibe o gráfico de linha para o mês clicado
        });
    });
}

// Fecha o modal ao clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('balanceModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// Atualiza o conteúdo do modal ao redimensionar a janela
window.addEventListener('resize', updateModalContent);

// Verifica periodicamente se o mês mudou e atualiza os dados
setInterval(() => {
    const currentMonth = new Date().getMonth();
    if (lastFetchedMonth !== null && currentMonth !== lastFetchedMonth && document.getElementById('balanceModal').style.display === 'flex') {
        fetchBalanceData(); // Busca novos dados se o mês mudou e o modal está aberto
    }
}, 60000); // Verifica a cada 60 segundos