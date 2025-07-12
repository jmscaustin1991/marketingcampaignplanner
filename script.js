document.addEventListener('DOMContentLoaded', function() {
            // State management
            const state = {
                campaigns: [],
                cards: [],
                connectors: [],
                nextCardId: 1,
                nextCampaignId: 1,
                nextConnectorId: 1,
                editingCardId: null,
                editingCampaignId: null,
                editingConnectorId: null,
                connectingMode: false,
                connectingStartCard: null,
                draggingCard: null,
                draggingConnector: null,
                draggingConnectorPoint: null,
                cancelCallback: null
            };

            // DOM elements
            const timelineContainer = document.getElementById('timeline-container');
            const cardModal = document.getElementById('card-modal');
            const campaignModal = document.getElementById('campaign-modal');
            const cardForm = document.getElementById('card-form');
            const campaignForm = document.getElementById('campaign-form');
            const addCampaignBtn = document.getElementById('add-campaign-btn');
            const addEmailBtn = document.getElementById('add-email-btn');
            const addSocialBtn = document.getElementById('add-social-btn');
            const addBlogBtn = document.getElementById('add-blog-btn');
            const addEventBtn = document.getElementById('add-event-btn');
            const addConnectorBtn = document.getElementById('add-connector-btn');
            const closeModalBtn = document.getElementById('close-modal');
            const closeCampaignModalBtn = document.getElementById('close-campaign-modal');
            const saveCardBtn = document.getElementById('save-card');
            const saveCampaignBtn = document.getElementById('save-campaign');
            const deleteCardBtn = document.getElementById('delete-card');
            const deleteCampaignBtn = document.getElementById('delete-campaign');
            const duplicateCardBtn = document.getElementById('duplicate-card');
            const addCustomFieldBtn = document.getElementById('add-custom-field');

            // Initialize the timeline
            renderTimeline();
            
            // Filter state
            const filters = {
                search: '',
                status: 'all',
                contentTypes: {
                    email: true,
                    social: true,
                    blog: true,
                    event: true
                }
            };

            // Event listeners
            addCampaignBtn.addEventListener('click', openAddCampaignModal);
            document.getElementById('empty-add-campaign-btn').addEventListener('click', openAddCampaignModal);
            addEmailBtn.addEventListener('click', () => addNewCard('email'));
            addSocialBtn.addEventListener('click', () => addNewCard('social'));
            addBlogBtn.addEventListener('click', () => addNewCard('blog'));
            addEventBtn.addEventListener('click', () => addNewCard('event'));
            addConnectorBtn.addEventListener('click', toggleConnectingMode);
            closeModalBtn.addEventListener('click', closeCardModal);
            closeCampaignModalBtn.addEventListener('click', closeCampaignModal);
            document.getElementById('close-connector-modal').addEventListener('click', closeConnectorModal);
            saveCardBtn.addEventListener('click', saveCardChanges);
            saveCampaignBtn.addEventListener('click', saveCampaignChanges);
            document.getElementById('save-connector').addEventListener('click', saveConnectorChanges);
            deleteCardBtn.addEventListener('click', deleteCard);
            deleteCampaignBtn.addEventListener('click', deleteCampaign);
            document.getElementById('delete-connector').addEventListener('click', deleteConnectorFromModal);
            duplicateCardBtn.addEventListener('click', duplicateCard);
            addCustomFieldBtn.addEventListener('click', addCustomField);
            
            // Filter event listeners
            document.getElementById('search-input').addEventListener('input', (e) => {
                filters.search = e.target.value.toLowerCase();
                applyFilters();
            });
            
            document.getElementById('status-filter').addEventListener('change', (e) => {
                filters.status = e.target.value;
                applyFilters();
            });
            
            document.querySelectorAll('.content-type-filter').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    filters.contentTypes[e.target.value] = e.target.checked;
                    applyFilters();
                });
            });

            // Render the timeline
            function renderTimeline() {
                timelineContainer.innerHTML = '';
                
                // Show/hide empty state
                const emptyState = document.getElementById('empty-state');
                if (state.campaigns.length === 0) {
                    emptyState.style.display = 'flex';
                } else {
                    emptyState.style.display = 'none';
                }
                
                // Create campaign rows
                state.campaigns.forEach(campaign => {
                    const campaignRow = document.createElement('div');
                    campaignRow.className = 'campaign-row flex border-b border-gray-200 relative';
                    campaignRow.dataset.campaignId = campaign.id;
                    
                    // Campaign name cell
                    const nameCell = document.createElement('div');
                    nameCell.className = 'campaign-name w-64 min-w-[16rem] p-4 border-r border-gray-200 flex items-center justify-between';
                    
                    const nameContent = document.createElement('div');
                    nameContent.className = 'flex items-center space-x-2';
                    
                    const colorIndicator = document.createElement('div');
                    colorIndicator.className = 'w-3 h-3 rounded-full';
                    colorIndicator.style.backgroundColor = campaign.color;
                    
                    const nameText = document.createElement('span');
                    nameText.className = 'font-medium text-gray-800';
                    nameText.textContent = campaign.name;
                    
                    nameContent.appendChild(colorIndicator);
                    nameContent.appendChild(nameText);
                    
                    const editButton = document.createElement('button');
                    editButton.className = 'text-gray-400 hover:text-gray-600';
                    editButton.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
                    editButton.addEventListener('click', () => openEditCampaignModal(campaign.id));
                    
                    nameCell.appendChild(nameContent);
                    nameCell.appendChild(editButton);
                    
                    // Timeline cells
                    const timelineCells = document.createElement('div');
                    timelineCells.className = 'flex-grow grid grid-cols-12 h-20';
                    timelineCells.style.gridTemplateColumns = 'repeat(12, minmax(120px, 1fr))';
                    
                    // Create 12 weeks (3 months x 4 weeks)
                    for (let i = 0; i < 12; i++) {
                        const cell = document.createElement('div');
                        cell.className = 'timeline-cell relative';
                        cell.dataset.week = i;
                        cell.dataset.campaignId = campaign.id;
                        
                        // Make cells droppable
                        cell.addEventListener('dragover', handleDragOver);
                        cell.addEventListener('drop', handleDrop);
                        
                        timelineCells.appendChild(cell);
                    }
                    
                    campaignRow.appendChild(nameCell);
                    campaignRow.appendChild(timelineCells);
                    timelineContainer.appendChild(campaignRow);
                });
                
                // Render content cards
                renderCards();
                
                // Render connectors
                renderConnectors();
            }
            
            // Render content cards
            function renderCards() {
                state.cards.forEach(card => {
                    createCardElement(card);
                });
            }
            
            // Apply filters to cards
            function applyFilters() {
                const cardElements = document.querySelectorAll('.content-card');
                
                cardElements.forEach(cardElement => {
                    const cardId = parseInt(cardElement.dataset.cardId);
                    const card = state.cards.find(c => c.id === cardId);
                    
                    if (!card) return;
                    
                    let visible = true;
                    
                    // Filter by content type
                    if (!filters.contentTypes[card.type]) {
                        visible = false;
                    }
                    
                    // Filter by status
                    if (filters.status !== 'all' && card.status !== filters.status) {
                        visible = false;
                    }
                    
                    // Filter by search text
                    if (filters.search && !card.title.toLowerCase().includes(filters.search)) {
                        visible = false;
                    }
                    
                    // Apply visibility
                    cardElement.style.display = visible ? 'block' : 'none';
                });
                
                // Update connectors visibility
                updateConnectorsVisibility();
            }
            
            // Update connectors visibility based on card visibility
            function updateConnectorsVisibility() {
                const connectorElements = document.querySelectorAll('.connector');
                const connectorControls = document.querySelectorAll('.connector-handle');
                
                state.connectors.forEach(connector => {
                    const startCard = document.querySelector(`.content-card[data-card-id="${connector.startCardId}"]`);
                    const endCard = document.querySelector(`.content-card[data-card-id="${connector.endCardId}"]`);
                    
                    const startVisible = startCard && startCard.style.display !== 'none';
                    const endVisible = endCard && endCard.style.display !== 'none';
                    const visible = startVisible && endVisible;
                    
                    // Update connector lines visibility
                    connectorElements.forEach(element => {
                        if (parseInt(element.dataset.connectorId) === connector.id) {
                            element.style.display = visible ? 'block' : 'none';
                        }
                    });
                    
                    // Update connector controls visibility
                    connectorControls.forEach(element => {
                        if (parseInt(element.dataset.connectorId) === connector.id) {
                            element.style.display = visible ? 'flex' : 'none';
                        }
                    });
                });
            }
            
            // Create a card element
            function createCardElement(card) {
                const campaign = state.campaigns.find(c => c.id === card.campaignId);
                if (!campaign) return;
                
                const cardElement = document.createElement('div');
                cardElement.className = `content-card ${card.type}`;
                cardElement.dataset.cardId = card.id;
                cardElement.draggable = true;
                
                // Calculate position based on date
                const campaignRow = document.querySelector(`.campaign-row[data-campaign-id="${card.campaignId}"]`);
                if (!campaignRow) return;
                
                // Calculate week based on the card's date
                const cardDate = new Date(card.date);
                const month = cardDate.getMonth(); // 0-based (0 = January)
                const day = cardDate.getDate();
                
                // Calculate which week of the month (0-3)
                const weekOfMonth = Math.floor((day - 1) / 7);
                
                // Calculate which month column (0-2 for Jan-Mar)
                const monthColumn = Math.min(month, 2); // Cap at March (index 2)
                
                // Final week position (0-11)
                const weekPosition = (monthColumn * 4) + weekOfMonth;
                
                // Update card's position in state
                card.position = {
                    week: weekPosition,
                    day: (day - 1) % 7 // Day within week (0-6)
                };
                
                const cell = campaignRow.querySelector(`.timeline-cell[data-week="${card.position.week}"]`);
                if (!cell) return;
                
                const cellRect = cell.getBoundingClientRect();
                const dayOffset = (card.position.day / 7) * cellRect.width;
                
                cardElement.style.left = `${cell.offsetLeft + dayOffset}px`;
                cardElement.style.top = `${cell.offsetTop + 10}px`;
                
                // Card content
                const title = document.createElement('div');
                title.className = 'text-sm font-medium';
                title.textContent = card.title;
                
                const details = document.createElement('div');
                details.className = 'text-xs mt-1 flex items-center justify-between';
                
                const typeIcon = document.createElement('span');
                typeIcon.className = 'mr-1';
                switch (card.type) {
                    case 'email':
                        typeIcon.innerHTML = '<i class="fas fa-envelope"></i>';
                        break;
                    case 'social':
                        typeIcon.innerHTML = '<i class="fas fa-hashtag"></i>';
                        break;
                    case 'blog':
                        typeIcon.innerHTML = '<i class="fas fa-pen-fancy"></i>';
                        break;
                    case 'event':
                        typeIcon.innerHTML = '<i class="fas fa-calendar-alt"></i>';
                        break;
                }
                
                const date = document.createElement('span');
                date.textContent = formatDate(card.date);
                
                const status = document.createElement('span');
                status.className = `text-xs px-2 py-1 rounded-full ${getStatusClass(card.status)}`;
                status.textContent = card.status;
                
                details.appendChild(typeIcon);
                details.appendChild(date);
                details.appendChild(status);
                
                cardElement.appendChild(title);
                cardElement.appendChild(details);
                
                // Event listeners
                cardElement.addEventListener('dragstart', handleDragStart);
                cardElement.addEventListener('dragend', handleDragEnd);
                cardElement.addEventListener('click', (e) => {
                    if (!state.connectingMode) {
                        openEditCardModal(card.id);
                    } else {
                        handleCardConnect(card.id);
                    }
                    e.stopPropagation();
                });
                
                timelineContainer.appendChild(cardElement);
            }
            
            // Render connectors
            function renderConnectors() {
                // Remove existing connectors
                document.querySelectorAll('.connector, .connector-handle').forEach(el => el.remove());
                
                state.connectors.forEach(connector => {
                    const startCard = document.querySelector(`.content-card[data-card-id="${connector.startCardId}"]`);
                    const endCard = document.querySelector(`.content-card[data-card-id="${connector.endCardId}"]`);
                    
                    if (!startCard || !endCard) return;
                    
                    const startRect = startCard.getBoundingClientRect();
                    const endRect = endCard.getBoundingClientRect();
                    
                    const startX = startRect.left + startRect.width / 2;
                    const startY = startRect.top + startRect.height / 2;
                    const endX = endRect.left + endRect.width / 2;
                    const endY = endRect.top + endRect.height / 2;
                    
                    // Create connector line
                    drawConnector(connector, startCard, endCard);
                });
            }
            
            // Draw a connector between two cards
            function drawConnector(connector, startCard, endCard) {
                const startRect = startCard.getBoundingClientRect();
                const endRect = endCard.getBoundingClientRect();
                
                const timelineRect = timelineContainer.getBoundingClientRect();
                
                const startX = startCard.offsetLeft + startRect.width / 2;
                const startY = startCard.offsetTop + startRect.height / 2;
                const endX = endCard.offsetLeft + endRect.width / 2;
                const endY = endCard.offsetTop + endRect.height / 2;
                
                // Create points if none exist
                if (!connector.points || connector.points.length === 0) {
                    connector.points = [
                        { x: startX + (endX - startX) / 3, y: startY },
                        { x: endX - (endX - startX) / 3, y: endY }
                    ];
                }
                
                // Draw lines
                const points = [
                    { x: startX, y: startY },
                    ...connector.points,
                    { x: endX, y: endY }
                ];
                
                for (let i = 0; i < points.length - 1; i++) {
                    const line = document.createElement('div');
                    line.className = 'connector';
                    line.dataset.connectorId = connector.id;
                    line.dataset.segmentIndex = i;
                    
                    const x1 = points[i].x;
                    const y1 = points[i].y;
                    const x2 = points[i + 1].x;
                    const y2 = points[i + 1].y;
                    
                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                    
                    line.style.width = `${length}px`;
                    line.style.height = '2px';
                    line.style.left = `${x1}px`;
                    line.style.top = `${y1}px`;
                    line.style.transformOrigin = '0 0';
                    line.style.transform = `rotate(${angle}deg)`;
                    
                    timelineContainer.appendChild(line);
                }
                
                // Add handles for middle points
                connector.points.forEach((point, index) => {
                    const handle = document.createElement('div');
                    handle.className = 'connector-handle';
                    handle.dataset.connectorId = connector.id;
                    handle.dataset.pointIndex = index;
                    handle.style.left = `${point.x - 5}px`;
                    handle.style.top = `${point.y - 5}px`;
                    
                    handle.addEventListener('mousedown', handleConnectorDragStart);
                    
                    timelineContainer.appendChild(handle);
                });
                
                // Add delete button for connector
                const midPoint = connector.points[Math.floor(connector.points.length / 2)];
                const deleteBtn = document.createElement('div');
                deleteBtn.className = 'connector-handle bg-red-500 hover:bg-red-600';
                deleteBtn.dataset.connectorId = connector.id;
                deleteBtn.style.left = `${midPoint.x - 5}px`;
                deleteBtn.style.top = `${midPoint.y - 20}px`;
                deleteBtn.innerHTML = '<i class="fas fa-times text-white text-xs"></i>';
                deleteBtn.title = 'Delete connector';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.display = 'flex';
                deleteBtn.style.alignItems = 'center';
                deleteBtn.style.justifyContent = 'center';
                
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteConnector(connector.id);
                });
                
                timelineContainer.appendChild(deleteBtn);
                
                // Add edit button for connector
                const editBtn = document.createElement('div');
                editBtn.className = 'connector-handle bg-blue-500 hover:bg-blue-600';
                editBtn.dataset.connectorId = connector.id;
                editBtn.style.left = `${midPoint.x - 20}px`;
                editBtn.style.top = `${midPoint.y - 20}px`;
                editBtn.innerHTML = '<i class="fas fa-edit text-white text-xs"></i>';
                editBtn.title = 'Edit connector';
                editBtn.style.cursor = 'pointer';
                editBtn.style.display = 'flex';
                editBtn.style.alignItems = 'center';
                editBtn.style.justifyContent = 'center';
                
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditConnectorModal(connector.id);
                });
                
                timelineContainer.appendChild(editBtn);
            }
            
            // Handle drag start for connector points
            function handleConnectorDragStart(e) {
                const connectorId = parseInt(e.target.dataset.connectorId);
                const pointIndex = parseInt(e.target.dataset.pointIndex);
                
                state.draggingConnector = connectorId;
                state.draggingConnectorPoint = pointIndex;
                
                document.addEventListener('mousemove', handleConnectorDragMove);
                document.addEventListener('mouseup', handleConnectorDragEnd);
                
                e.preventDefault();
            }
            
            // Handle drag move for connector points
            function handleConnectorDragMove(e) {
                if (!state.draggingConnector) return;
                
                const connector = state.connectors.find(c => c.id === state.draggingConnector);
                if (!connector) return;
                
                const timelineRect = timelineContainer.getBoundingClientRect();
                const scrollLeft = timelineContainer.parentElement.scrollLeft;
                const scrollTop = timelineContainer.parentElement.scrollTop;
                
                const x = e.clientX - timelineRect.left + scrollLeft;
                const y = e.clientY - timelineRect.top + scrollTop;
                
                connector.points[state.draggingConnectorPoint] = { x, y };
                
                // Re-render connectors
                renderConnectors();
            }
            
            // Handle drag end for connector points
            function handleConnectorDragEnd() {
                state.draggingConnector = null;
                state.draggingConnectorPoint = null;
                
                document.removeEventListener('mousemove', handleConnectorDragMove);
                document.removeEventListener('mouseup', handleConnectorDragEnd);
            }
            
            // Handle card drag start
            function handleDragStart(e) {
                const cardId = parseInt(e.target.dataset.cardId);
                state.draggingCard = cardId;
                e.target.classList.add('dragging');
                
                // Set data transfer
                e.dataTransfer.setData('text/plain', cardId);
                e.dataTransfer.effectAllowed = 'move';
            }
            
            // Handle card drag end
            function handleDragEnd(e) {
                e.target.classList.remove('dragging');
                state.draggingCard = null;
            }
            
            // Handle drag over
            function handleDragOver(e) {
                if (state.draggingCard) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }
            }
            
            // Handle drop
            function handleDrop(e) {
                e.preventDefault();
                
                const cardId = parseInt(e.dataTransfer.getData('text/plain'));
                const campaignId = parseInt(e.currentTarget.dataset.campaignId);
                const week = parseInt(e.currentTarget.dataset.week);
                
                // Calculate day position within the week cell
                const cellRect = e.currentTarget.getBoundingClientRect();
                const relativeX = e.clientX - cellRect.left;
                const day = Math.floor((relativeX / cellRect.width) * 7);
                
                // Update card position temporarily
                const card = state.cards.find(c => c.id === cardId);
                if (card) {
                    // Store original values in case user cancels
                    const originalCampaignId = card.campaignId;
                    const originalDate = card.date;
                    
                    // Update campaign
                    card.campaignId = campaignId;
                    
                    // Calculate new date based on the dropped position
                    const monthIndex = Math.floor(week / 4); // 0, 1, or 2 for Jan, Feb, Mar
                    const weekOfMonth = week % 4; // 0-3 for weeks within month
                    
                    // Calculate day of month (1-31)
                    const dayOfMonth = (weekOfMonth * 7) + day + 1;
                    
                    // Create new date (2023 as placeholder year)
                    const newDate = new Date(2023, monthIndex, dayOfMonth);
                    
                    // Format as YYYY-MM-DD
                    const formattedDate = newDate.toISOString().split('T')[0].replace(/^[^-]+-/, '2023-');
                    card.date = formattedDate;
                    
                    // Open edit modal to confirm the change
                    openEditCardModal(cardId, true, () => {
                        // This is the cancel callback - restore original values
                        card.campaignId = originalCampaignId;
                        card.date = originalDate;
                        renderTimeline();
                    });
                    
                    // Re-render the timeline
                    renderTimeline();
                }
            }
            
            // Toggle connecting mode
            function toggleConnectingMode() {
                state.connectingMode = !state.connectingMode;
                
                if (state.connectingMode) {
                    addConnectorBtn.classList.add('bg-gray-300');
                    timelineContainer.style.cursor = 'crosshair';
                } else {
                    addConnectorBtn.classList.remove('bg-gray-300');
                    timelineContainer.style.cursor = 'default';
                    state.connectingStartCard = null;
                }
            }
            
            // Handle card connect
            function handleCardConnect(cardId) {
                if (!state.connectingStartCard) {
                    state.connectingStartCard = cardId;
                } else {
                    // Don't connect a card to itself
                    if (state.connectingStartCard === cardId) {
                        state.connectingStartCard = null;
                        return;
                    }
                    
                    // Create a new connector
                    const newConnector = {
                        id: state.nextConnectorId++,
                        startCardId: state.connectingStartCard,
                        endCardId: cardId,
                        points: []
                    };
                    
                    state.connectors.push(newConnector);
                    
                    // Reset connecting state
                    state.connectingStartCard = null;
                    toggleConnectingMode();
                    
                    // Re-render connectors
                    renderConnectors();
                }
            }
            
            // Delete connector
            function deleteConnector(connectorId) {
                if (confirm('Are you sure you want to delete this connector?')) {
                    state.connectors = state.connectors.filter(c => c.id !== connectorId);
                    renderConnectors();
                }
            }
            
            // Open edit connector modal
            function openEditConnectorModal(connectorId) {
                const connector = state.connectors.find(c => c.id === connectorId);
                if (!connector) return;
                
                state.editingConnectorId = connectorId;
                
                // Populate card dropdowns
                const startCardSelect = document.getElementById('connector-start-card');
                const endCardSelect = document.getElementById('connector-end-card');
                
                startCardSelect.innerHTML = '';
                endCardSelect.innerHTML = '';
                
                state.cards.forEach(card => {
                    const startOption = document.createElement('option');
                    startOption.value = card.id;
                    
                    const campaign = state.campaigns.find(c => c.id === card.campaignId);
                    startOption.textContent = `${campaign ? campaign.name + ': ' : ''}${card.title}`;
                    
                    if (card.id === connector.startCardId) {
                        startOption.selected = true;
                    }
                    
                    startCardSelect.appendChild(startOption);
                    
                    const endOption = document.createElement('option');
                    endOption.value = card.id;
                    endOption.textContent = `${campaign ? campaign.name + ': ' : ''}${card.title}`;
                    
                    if (card.id === connector.endCardId) {
                        endOption.selected = true;
                    }
                    
                    endCardSelect.appendChild(endOption);
                });
                
                document.getElementById('connector-modal').classList.remove('hidden');
            }
            
            // Close connector modal
            function closeConnectorModal() {
                document.getElementById('connector-modal').classList.add('hidden');
                state.editingConnectorId = null;
            }
            
            // Save connector changes
            function saveConnectorChanges() {
                if (!state.editingConnectorId) return;
                
                const connector = state.connectors.find(c => c.id === state.editingConnectorId);
                if (!connector) return;
                
                const startCardId = parseInt(document.getElementById('connector-start-card').value);
                const endCardId = parseInt(document.getElementById('connector-end-card').value);
                
                if (startCardId === endCardId) {
                    alert('Start and end cards cannot be the same');
                    return;
                }
                
                connector.startCardId = startCardId;
                connector.endCardId = endCardId;
                connector.points = []; // Reset points for new connection
                
                closeConnectorModal();
                renderConnectors();
            }
            
            // Delete connector from modal
            function deleteConnectorFromModal() {
                if (!state.editingConnectorId) return;
                
                deleteConnector(state.editingConnectorId);
                closeConnectorModal();
            }
            
            // Open add campaign modal
            function openAddCampaignModal() {
                state.editingCampaignId = null;
                document.getElementById('campaign-modal-title').textContent = 'Add Campaign';
                document.getElementById('campaign-name').value = '';
                document.getElementById('campaign-description').value = '';
                document.getElementById('campaign-start').value = '';
                document.getElementById('campaign-end').value = '';
                document.getElementById('campaign-color').value = '#6366f1';
                document.getElementById('delete-campaign').classList.add('hidden');
                
                campaignModal.classList.remove('hidden');
            }
            
            // Open edit campaign modal
            function openEditCampaignModal(campaignId) {
                const campaign = state.campaigns.find(c => c.id === campaignId);
                if (!campaign) return;
                
                state.editingCampaignId = campaignId;
                document.getElementById('campaign-modal-title').textContent = 'Edit Campaign';
                document.getElementById('campaign-name').value = campaign.name;
                document.getElementById('campaign-description').value = campaign.description;
                document.getElementById('campaign-start').value = campaign.startDate;
                document.getElementById('campaign-end').value = campaign.endDate;
                document.getElementById('campaign-color').value = campaign.color;
                document.getElementById('delete-campaign').classList.remove('hidden');
                
                campaignModal.classList.remove('hidden');
            }
            
            // Close campaign modal
            function closeCampaignModal() {
                campaignModal.classList.add('hidden');
                state.editingCampaignId = null;
            }
            
            // Save campaign changes
            function saveCampaignChanges() {
                const name = document.getElementById('campaign-name').value.trim();
                const description = document.getElementById('campaign-description').value.trim();
                const startDate = document.getElementById('campaign-start').value;
                const endDate = document.getElementById('campaign-end').value;
                const color = document.getElementById('campaign-color').value;
                
                if (!name) {
                    alert('Please enter a campaign name');
                    return;
                }
                
                if (state.editingCampaignId) {
                    // Update existing campaign
                    const campaign = state.campaigns.find(c => c.id === state.editingCampaignId);
                    if (campaign) {
                        campaign.name = name;
                        campaign.description = description;
                        campaign.startDate = startDate;
                        campaign.endDate = endDate;
                        campaign.color = color;
                    }
                } else {
                    // Add new campaign
                    const newCampaign = {
                        id: state.nextCampaignId++,
                        name,
                        description,
                        startDate,
                        endDate,
                        color
                    };
                    
                    state.campaigns.push(newCampaign);
                }
                
                // Close modal and re-render
                closeCampaignModal();
                renderTimeline();
            }
            
            // Delete campaign
            function deleteCampaign() {
                if (!state.editingCampaignId) return;
                
                if (confirm('Are you sure you want to delete this campaign? All associated content cards will also be deleted.')) {
                    // Remove campaign
                    state.campaigns = state.campaigns.filter(c => c.id !== state.editingCampaignId);
                    
                    // Remove associated cards
                    state.cards = state.cards.filter(c => c.campaignId !== state.editingCampaignId);
                    
                    // Remove associated connectors
                    const cardIds = state.cards.map(c => c.id);
                    state.connectors = state.connectors.filter(c => 
                        cardIds.includes(c.startCardId) && cardIds.includes(c.endCardId)
                    );
                    
                    // Close modal and re-render
                    closeCampaignModal();
                    renderTimeline();
                }
            }
            
            // Add new card
            function addNewCard(type) {
                if (state.campaigns.length === 0) {
                    alert('Please add a campaign first');
                    return;
                }
                
                // Get current date for default
                const today = new Date();
                const formattedDate = today.toISOString().split('T')[0];
                
                const newCard = {
                    id: state.nextCardId++,
                    campaignId: state.campaigns[0].id,
                    title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                    type,
                    date: formattedDate,
                    time: '12:00',
                    status: 'draft',
                    position: { week: 0, day: 0 }, // Will be calculated based on date
                    customFields: []
                };
                
                state.cards.push(newCard);
                renderTimeline();
                openEditCardModal(newCard.id);
            }
            
            // Open edit card modal
            function openEditCardModal(cardId, isFromDrop = false, cancelCallback = null) {
                const card = state.cards.find(c => c.id === cardId);
                if (!card) return;
                
                state.editingCardId = cardId;
                state.cancelCallback = cancelCallback;
                
                // Update modal title to indicate it's from a drop
                document.getElementById('modal-title').textContent = isFromDrop ? 
                    'Confirm New Card Date' : 'Edit Content Card';
                
                // Populate campaign dropdown
                const campaignSelect = document.getElementById('card-campaign');
                campaignSelect.innerHTML = '';
                
                state.campaigns.forEach(campaign => {
                    const option = document.createElement('option');
                    option.value = campaign.id;
                    option.textContent = campaign.name;
                    campaignSelect.appendChild(option);
                });
                
                // Set form values
                campaignSelect.value = card.campaignId;
                document.getElementById('card-title').value = card.title;
                document.getElementById('card-type').value = card.type;
                document.getElementById('card-date').value = card.date;
                document.getElementById('card-time').value = card.time;
                document.getElementById('card-status').value = card.status;
                
                // Highlight the date field if this is from a drop
                if (isFromDrop) {
                    const dateField = document.getElementById('card-date');
                    dateField.classList.add('ring-2', 'ring-yellow-400');
                    setTimeout(() => {
                        dateField.classList.remove('ring-2', 'ring-yellow-400');
                    }, 2000);
                }
                
                // Populate custom fields
                const customFieldsContainer = document.getElementById('custom-fields-container');
                customFieldsContainer.innerHTML = '';
                
                card.customFields.forEach((field, index) => {
                    addCustomFieldToForm(field.name, field.value);
                });
                
                cardModal.classList.remove('hidden');
            }
            
            // Close card modal
            function closeCardModal() {
                cardModal.classList.add('hidden');
                
                // If there's a cancel callback, execute it
                if (state.cancelCallback) {
                    state.cancelCallback();
                    state.cancelCallback = null;
                }
                
                state.editingCardId = null;
            }
            
            // Save card changes
            function saveCardChanges() {
                const card = state.cards.find(c => c.id === state.editingCardId);
                if (!card) return;
                
                card.campaignId = parseInt(document.getElementById('card-campaign').value);
                card.title = document.getElementById('card-title').value.trim();
                card.type = document.getElementById('card-type').value;
                card.date = document.getElementById('card-date').value;
                card.time = document.getElementById('card-time').value;
                card.status = document.getElementById('card-status').value;
                
                // Save custom fields
                card.customFields = [];
                const customFieldRows = document.querySelectorAll('.custom-field-row');
                customFieldRows.forEach(row => {
                    const nameInput = row.querySelector('.custom-field-name');
                    const valueInput = row.querySelector('.custom-field-value');
                    
                    if (nameInput && valueInput && nameInput.value.trim()) {
                        card.customFields.push({
                            name: nameInput.value.trim(),
                            value: valueInput.value.trim()
                        });
                    }
                });
                
                // Close modal and re-render
                closeCardModal();
                renderTimeline();
            }
            
            // Delete card
            function deleteCard() {
                if (!state.editingCardId) return;
                
                if (confirm('Are you sure you want to delete this content card?')) {
                    const cardIdToDelete = state.editingCardId;
                    
                    // Remove card
                    state.cards = state.cards.filter(c => c.id !== cardIdToDelete);
                    
                    // Remove associated connectors
                    state.connectors = state.connectors.filter(c => 
                        c.startCardId !== cardIdToDelete && c.endCardId !== cardIdToDelete
                    );
                    
                    // Close modal and re-render
                    closeCardModal();
                    renderTimeline();
                    
                    // Apply filters after re-rendering
                    applyFilters();
                }
            }
            
            // Duplicate card
            function duplicateCard() {
                const card = state.cards.find(c => c.id === state.editingCardId);
                if (!card) return;
                
                const newCard = {
                    ...JSON.parse(JSON.stringify(card)),
                    id: state.nextCardId++,
                    title: `${card.title} (Copy)`,
                    position: { ...card.position, day: (card.position.day + 1) % 7 }
                };
                
                state.cards.push(newCard);
                
                // Close modal and re-render
                closeCardModal();
                renderTimeline();
            }
            
            // Add custom field
            function addCustomField() {
                addCustomFieldToForm('', '');
            }
            
            // Add custom field to form
            function addCustomFieldToForm(name, value) {
                const customFieldsContainer = document.getElementById('custom-fields-container');
                
                const fieldRow = document.createElement('div');
                fieldRow.className = 'custom-field-row flex items-center space-x-2 mb-2';
                
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.className = 'custom-field-name w-1/2 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
                nameInput.placeholder = 'Field name';
                nameInput.value = name;
                
                const valueInput = document.createElement('input');
                valueInput.type = 'text';
                valueInput.className = 'custom-field-value w-1/2 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
                valueInput.placeholder = 'Value';
                valueInput.value = value;
                
                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'text-red-500 hover:text-red-700';
                removeButton.innerHTML = '<i class="fas fa-times"></i>';
                removeButton.addEventListener('click', () => {
                    fieldRow.remove();
                });
                
                fieldRow.appendChild(nameInput);
                fieldRow.appendChild(valueInput);
                fieldRow.appendChild(removeButton);
                
                customFieldsContainer.appendChild(fieldRow);
            }
            
            // Helper functions
            function formatDate(dateString) {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            
            function getStatusClass(status) {
                switch (status) {
                    case 'draft': return 'status-draft';
                    case 'scheduled': return 'status-scheduled';
                    case 'sent': return 'status-sent';
                    default: return '';
                }
            }
        });
