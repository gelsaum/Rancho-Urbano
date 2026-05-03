const API_URL = '/api/leads';
const container = document.getElementById('leads-container');
const emptyState = document.getElementById('empty-state');
const leadCount = document.getElementById('lead-count');
const refreshBtn = document.getElementById('refresh-btn');

// Função para formatar o número do WhatsApp limpando o @s.whatsapp.net
function formatPhone(jid) {
    if (!jid) return '';
    return jid.includes('@') ? jid.split('@')[0] : jid;
}

// Formatar tempo relativo (ex: 5 min atrás)
function formatRelativeTime(isoString) {
    if (!isoString) return 'Desconhecido';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin} min atrás`;
    
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    return date.toLocaleDateString();
}

// Criar elemento do spinner
function getSpinner() {
    return `<svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>`;
}

// Renderizar um card de lead
function createLeadCard(lead) {
    const card = document.createElement('div');
    card.className = 'lead-card';
    card.id = `lead-${lead.jid}`;
    
    // Calcula urgência (10 minutos de espera após o término da triagem)
    const baseTime = lead.data.triageCompletedAt ? new Date(lead.data.triageCompletedAt).getTime() : new Date(lead.updated_at).getTime();
    const now = Date.now();
    const diffMin = (now - baseTime) / (1000 * 60);
    const isUrgent = diffMin >= 10 && lead.data && !lead.data.urgencyDismissed;

    if (isUrgent) {
        card.classList.add('urgency-alert');
    }

    const phone = formatPhone(lead.jid);
    const pushName = (lead.data && lead.data.pushName) ? lead.data.pushName : 'Desconhecido';
    
    // Tratativa para os interesses com ícones e formatação mais limpa
    let interestsHtml = `<span class="data-value">Nenhum item registrado</span>`;
    if (lead.data && lead.data.interests && lead.data.interests.length > 0) {
        const ICONS = {
            'Camisas/Camisetas': '👕',
            'Calças/Shorts': '👖',
            'Calçados': '👟',
            'Acessórios': '🎀',
            'Bebidas': '🍸',
            'Ervas (Tereré/Chimarrão)': '🌿',
            'Outro': '🎁'
        };

        interestsHtml = lead.data.interests.map(item => {
            let categoryName = item.split(' (')[0];
            let icon = ICONS[categoryName] || '🛍️';
            
            let itemText = item;
            itemText = itemText.replace(' (Tamanho: ', ' → Tam: ')
                               .replace(' (Número: ', ' → Nº: ')
                               .replace(' (', ' → ')
                               .replace(')', '');
            return `<span class="tag">${icon} ${itemText}</span>`;
        }).join('');
    }

    // Tratativa para o método de entrega
    let deliveryMethod = (lead.data && lead.data.deliveryMethod) || 'Não informada';
    let deliveryHtml = '';
    if (deliveryMethod === 'Retirar na loja') {
        deliveryHtml = `<span class="data-value" style="color:#4ade80;">📍 <b>RETIRADA:</b> Na Loja Física</span>`;
    } else if (deliveryMethod.includes('Entregar na cidade')) {
        let match = deliveryMethod.match(/Entregar na cidade: (.*) \(CI: (.*)\)/);
        if (match) {
            deliveryHtml = `
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <span class="data-value" style="color:#60a5fa;">📍 <b>ENTREGA:</b> <span style="color:#e2e8f0;">${match[1]}</span></span>
                    <span class="data-value" style="font-size: 0.9em; color: #94a3b8;">🆔 CI: ${match[2]}</span>
                </div>
            `;
        } else {
            deliveryHtml = `<span class="data-value">${deliveryMethod}</span>`;
        }
    } else {
        deliveryHtml = `<span class="data-value">${deliveryMethod}</span>`;
    }

    card.innerHTML = `
        <div class="card-header">
            <div class="phone-number" style="display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <div style="display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-weight: 600; color: #f8fafc; font-size: 15px;" id="name-${lead.jid}">${pushName}</span>
                        <button onclick="syncName('${lead.jid}')" style="background: none; border: none; cursor: pointer; color: #64748b; padding: 0; display: flex; align-items: center;" title="Atualizar Nome na API">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                        </button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px; color: #94a3b8;">${phone}</span>
                        ${isUrgent ? `
                        <button onclick="dismissUrgency('${lead.jid}')" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer;" title="Remover alerta de urgência">
                            Desativar Alerta
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            <a href="https://wa.me/${phone}" target="_blank" class="wa-link" title="Abrir WhatsApp Web">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
        </div>
        <div class="card-body">
            <div class="data-group">
                <span class="data-label">Itens de Interesse</span>
                <div class="interest-tags">
                    ${interestsHtml}
                </div>
            </div>
            <div class="data-group">
                <span class="data-label">Forma de Entrega</span>
                ${deliveryHtml}
            </div>
            <div class="data-group time-info" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--card-border); font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px;">
                <span style="color: #94a3b8;">🏁 Finalizado às: <b style="color: #e2e8f0;">${lead.data.triageCompletedAt ? new Date(lead.data.triageCompletedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Desconhecido'}</b></span>
                <span style="color: #94a3b8;">⏳ Aguardando há: <b style="color: ${isUrgent ? '#f87171' : '#e2e8f0'};">${formatRelativeTime(lead.data.triageCompletedAt)}</b></span>
            </div>
        </div>
        <div class="card-footer">
            <button class="btn-release" onclick="releaseLead('${lead.jid}', '${pushName.replace(/'/g, "\\'")}')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Marcar como Atendido
            </button>
        </div>
    `;
    
    return card;
}

// Buscar dados e renderizar
async function fetchLeads() {
    refreshBtn.classList.add('loading');
    refreshBtn.innerHTML = getSpinner();
    
    try {
        const res = await fetch(API_URL);
        const leads = await res.json();
        
        container.innerHTML = '';
        leadCount.textContent = `${leads.length} Pendente${leads.length !== 1 ? 's' : ''}`;
        
        if (leads.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            leads.forEach(lead => {
                container.appendChild(createLeadCard(lead));
            });
        }
    } catch (err) {
        console.error("Erro ao buscar leads:", err);
        leadCount.textContent = "Erro de conexão";
    } finally {
        setTimeout(() => {
            refreshBtn.classList.remove('loading');
            refreshBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>`;
        }, 500); // pequeno delay para melhor feedback visual
    }
}

// Sincronizar nome da Evolution API
async function syncName(jid) {
    const nameEl = document.getElementById(`name-${jid}`);
    const originalText = nameEl.innerText;
    nameEl.innerText = 'Buscando...';
    
    try {
        const res = await fetch(`/api/leads/${jid}/profile`);
        const data = await res.json();
        
        if (data.success && data.name) {
            nameEl.innerText = data.name;
            // Atualizar o onclick do botão de release para refletir o novo nome
            const card = document.getElementById(`lead-${jid}`);
            const btn = card.querySelector('.btn-release');
            btn.setAttribute('onclick', `releaseLead('${jid}', '${data.name.replace(/'/g, "\\'")}')`);
        } else {
            nameEl.innerText = originalText;
        }
    } catch (err) {
        console.error("Erro ao sincronizar nome:", err);
        nameEl.innerText = originalText;
    }
}

// Ação de liberar o lead
async function releaseLead(jid, name) {
    if (!confirm(`Tem certeza que quer finalizar o atendimento para: ${name}?`)) {
        return;
    }

    const card = document.getElementById(`lead-${jid}`);
    const btn = card.querySelector('.btn-release');
    
    btn.classList.add('loading');
    btn.innerHTML = getSpinner() + ' Processando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/${jid}/release`, {
            method: 'POST'
        });
        const data = await res.json();
        
        if (data.success) {
            card.style.transform = 'scale(0.95)';
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
                fetchLeads(); // Atualiza contador e verifica empty state
            }, 300);
        } else {
            alert("Falha ao atualizar o lead: " + (data.error || "Erro desconhecido"));
            btn.classList.remove('loading');
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Tentar Novamente';
            btn.disabled = false;
        }
    } catch (err) {
        console.error("Erro ao dar release no lead:", err);
        alert("Erro de conexão.");
        btn.classList.remove('loading');
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Tentar Novamente';
        btn.disabled = false;
    }
}

// ----------------------
// Sistema de Abas e Contatos
// ----------------------

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remover classe ativa de todos
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        // Ativar aba atual
        btn.classList.add('active');
        const target = btn.getAttribute('data-target');
        document.getElementById(target).classList.add('active');
        
        // Se a aba for de contatos, buscar contatos
        if (target === 'tab-contatos') {
            fetchContacts();
        } else {
            fetchLeads();
        }
    });
});

let allContacts = [];

async function fetchContacts() {
    try {
        const res = await fetch('/api/contacts');
        const contacts = await res.json();
        
        // Filtrar contatos válidos e ordenar por data de última interação
        allContacts = contacts.filter(c => c.jid && c.jid.includes('@s.whatsapp.net'))
                              .reverse(); // Maior chance dos últimos ficarem em cima
        
        renderContactsTable(allContacts);
    } catch (err) {
        console.error("Erro ao buscar contatos:", err);
    }
}

function renderContactsTable(contacts) {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    contacts.forEach(contact => {
        const phone = formatPhone(contact.jid);
        const name = (contact.data && contact.data.pushName) ? contact.data.pushName : 'Desconhecido';
        const isIgnored = contact.data && contact.data.ignored === true;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight: 500; color: #f8fafc;">${name}</div>
            </td>
            <td>
                <span style="color: #94a3b8; font-family: monospace;">${phone}</span>
            </td>
            <td>
                <div class="status-cell">
                    <label class="switch">
                        <input type="checkbox" onchange="toggleBotStatus('${contact.jid}', this.checked)" ${!isIgnored ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                    <span id="status-text-${contact.jid.replace('@s.whatsapp.net','')}" class="status-label ${!isIgnored ? 'active' : 'ignored'}">
                        ${!isIgnored ? 'Ativado' : 'Ignorado'}
                    </span>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Filtro da busca
document.getElementById('contact-search')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allContacts.filter(c => {
        const name = ((c.data && c.data.pushName) || 'desconhecido').toLowerCase();
        const phone = formatPhone(c.jid).toLowerCase();
        return name.includes(term) || phone.includes(term);
    });
    renderContactsTable(filtered);
});

// Desativar alerta de urgência
async function dismissUrgency(jid) {
    try {
        const res = await fetch(`/api/leads/${jid}/dismiss-urgency`, {
            method: 'POST'
        });
        const data = await res.json();
        
        if (data.success) {
            // Re-renderizar painel
            fetchLeads();
        } else {
            alert('Falha ao desativar alerta: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (err) {
        console.error("Erro ao desativar alerta:", err);
        alert('Falha de conexão ao desativar alerta.');
    }
}

// Alternar status
async function toggleBotStatus(jid, isBotActive) {
    const isIgnored = !isBotActive; // Se está ativo, ignored é falso.
    const statusText = document.getElementById(`status-text-${jid.replace('@s.whatsapp.net','')}`);
    if (statusText) statusText.innerText = 'Salvando...';
    
    try {
        const res = await fetch(`/api/contacts/${jid}/toggle-ignore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ignored: isIgnored })
        });
        
        const data = await res.json();
        if (data.success && statusText) {
            statusText.innerText = isIgnored ? 'Ignorado' : 'Ativado';
            statusText.className = `status-label ${isIgnored ? 'ignored' : 'active'}`;
            
            // Atualizar na memória
            const contact = allContacts.find(c => c.jid === jid);
            if (contact && contact.data) {
                contact.data.ignored = isIgnored;
            }
        }
    } catch (err) {
        console.error("Erro ao alterar status:", err);
        if (statusText) statusText.innerText = "Erro";
    }
}

// Event Listeners base
refreshBtn.addEventListener('click', () => {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-target') === 'tab-contatos') {
        fetchContacts();
    } else {
        fetchLeads();
    }
});

// Inicialização
fetchLeads();

// Atualiza a cada 30 segundos (só a triagem para não sobrecarregar a tela de contatos caso esteja aberta)
setInterval(() => {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-target') === 'tab-triagem') {
        fetchLeads();
    }
}, 30000);
