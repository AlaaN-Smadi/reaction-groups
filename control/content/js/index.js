'use strict';

const State = {
    warn: false,
    activeGroup: {},
    groupIndex: 0,
    addNewGroup: false,
    activePage: '',
}

const APIHandlers = {
    savingTimer: null, sendingTimer: null,

    updateGroups() {
        clearTimeout(this.savingTimer);
        this.savingTimer = setTimeout(() => {
            GroupsList.groups = GroupsList.list.sortableList.items;
            // update the db data
            let reactionsGroup = new ReactionsGroup({ groups: GroupsList.groups });
            ReactionsGroups.update(reactionsGroup, (err, res) => {
                if (err) { console.log(err) }
                State.addNewGroup = false;

                if (State.activePage !== 'groupList') {
                    Views.navigate('groupList');
                }
                let groups = GroupsList.groups, reactions = [];
                if (groups && groups[0] && groups[0].reactions) {
                    reactions = groups[0].reactions;
                }
                this.sendToWidget(false, reactions);
            })
        }, 300)
    },

    getGroups() {
        ReactionsGroups.get({}, (err, res) => {
            if (err) return console.error(err);

            if (!res || !res.groups) {
                GroupsList.groups = [];
                GroupsList.list.init([]);
                GroupsList.updateEmptyState("empty");

                let reactionGroups = new ReactionsGroup({ groups: [] });

                ReactionsGroups.insert(reactionGroups, (err, res) => {
                    if (err) return console.error(err);

                })
            } else if (!res.groups.length) {
                GroupsList.groups = [];
                GroupsList.list.init([]);
                return GroupsList.updateEmptyState("empty");
            } else {
                GroupsList.groups = res.groups;
                GroupsList.list.init(res.groups);

                return GroupsList.updateEmptyState("list printed");
            }
        })
    },

    /**
     * @param {boolean} openReactionList 
     * @param {Array} reactions 
     */
    sendToWidget(openReactionList, reactions) {
        clearTimeout(this.sendingTimer);
        this.sendingTimer = setTimeout(() => {
            let groups = GroupsList.groups;
            if (!groups.length) {
                groups = [{
                    name: ReactionsList.uiElements.inputGroupName?ReactionsList.uiElements.inputGroupName.value:'',
                    reactions: reactions
                }]
            }
            buildfire.messaging.sendMessageToWidget({
                openReactionList, reactions, groups
            });
        }, 300);
    }
}

const GroupsList = {
    uiElements: {}, groups: null, list: null,

    init() {
        this._initUIElements();
        this._addListeners();

        this._initList();
    },

    _addListeners() {
        this.uiElements.addBtn.addEventListener('click', () => {
            State.addNewGroup = true;
            Views.navigate('reactionList', { newGroup: true });
        })
    },

    _initList() {
        State.addNewGroup = false;

        this.list = new groupListUI('#sortableList');
        this.updateEmptyState("loading");

        if (!this.groups) {
            ReactionsGroups.get({}, (err, res) => {
                if (err) { }

                APIHandlers.getGroups();
            })
        } else {
            if (this.groups.length) {
                this.updateEmptyState("list printed");
                this.list.init(this.groups);
                APIHandlers.sendToWidget(false, this.groups[0].reactions);
            } else {
                this.list.init([]);
                this.updateEmptyState("empty");
                APIHandlers.sendToWidget(false, []);
            }
        }
    },

    _initUIElements() {
        this.uiElements = {
            addBtn: document.getElementById("add-group-btn"),
            emptyState: document.getElementById('emptyState'),
            sortableList: document.getElementById('sortableList'),
        }
    },

    updateEmptyState(state) {
        if (state == "loading") {
            this.uiElements.emptyState.innerHTML = `<div class="empty-state"><h4> Loading... </h4></div>`;
            this.uiElements.emptyState.classList.remove('hidden');
            this.uiElements.sortableList.classList.add('hidden');
        } else if (state == "empty") {
            this.uiElements.emptyState.innerHTML = `<div class="empty-state"><h4>You haven't added anything yet</h4></div>`;
            this.uiElements.emptyState.classList.remove('hidden');
            this.uiElements.sortableList.classList.add('hidden');
        } else {
            this.uiElements.emptyState.classList.add('hidden');
            this.uiElements.sortableList.classList.remove('hidden');
        }
    }
}

const ReactionsList = {
    uiElements: {}, reactions: [], list: null,

    init(options) {
        this._initUIElements();
        this._buildBreadCrumbs(['Reactions', options.name ? options.name : 'New Group']);
        this._addListeners();

        this._initList(options);
        State.activeGroup = options;

        APIHandlers.sendToWidget(true, this.reactions);
    },

    _addListeners() {
        this.uiElements.cancle.addEventListener('click', () => {
            if (!State.warn) return Views.navigate('groupList');
            else {
                let cancelOptions = {
                    title: `Unsaved Changes`,
                    message: `This page contains unsaved changes. Do you still wish to leave the page?`,
                    confirmButton: { text: "Leave Page", type: "danger" },
                }
                buildfire.dialog.confirm(cancelOptions, (e, isConfirmed) => {
                    if (e) console.error(e);

                    if (isConfirmed) {
                        if (e) console.error(e);
                        if (isConfirmed) {
                            let groups = GroupsList.groups, reactions = [];
                            if (groups && groups[0] && groups[0].reactions) {
                                reactions = groups[0].reactions;
                            }
                            APIHandlers.sendToWidget(false, reactions);

                            return Views.navigate('groupList');
                        }
                    }
                });
            }
        });

        this.uiElements.inputGroupName.addEventListener('keyup', (e) => {
            State.warn = true;
            this.toggleSaveButton();
        })

        this.uiElements.addBtn.addEventListener('click', () => {
            if (this.list.sortableList.items.length < 5) {
                State.warn = true;
                clearTimeout(this.savingTimer);
                this.savingTimer = setTimeout(() => {
                    this.updateEmptyState("list printed");

                    const id = uuidv4();
                    const newReaction = new ReactionsTypes({ id });
                    this.list.addItem(newReaction);
                    this.toggleSaveButton();
                }, 100);
            }
        })

        this.uiElements.save.addEventListener('click', () => {
            if (State.warn) {
                State.warn = false;

                if (!this.uiElements.inputGroupName.value) { return }
                let repeatGroupName = false;
                GroupsList.groups.forEach((group, idx) => {
                    if ((idx !== State.groupIndex && !repeatGroupName && !State.addNewGroup) || (State.addNewGroup && !repeatGroupName)) {
                        repeatGroupName = this.uiElements.inputGroupName.value.toLowerCase() === group.name.toLowerCase();
                    }
                })
                if (repeatGroupName) {
                    State.warn = true;
                    this.uiElements.inputGroupName.classList.add('input-error');
                    this.uiElements.groupNameError.classList.remove('hidden');
                    return false;
                }

                buildfire.auth.getCurrentUser((err, user) => {
                    if (err) return console.error(err);

                    if (State.addNewGroup) {
                        let newGroup = new Group({
                            createdBy: user.userId,
                            lastUpdatedBy: user.userId,
                            name: this.uiElements.inputGroupName.value,
                            reactions: this.list.sortableList.items
                        })
                        GroupsList.list.addItem(newGroup);
                    } else {
                        let updatedGroup = new Group({
                            ...State.activeGroup,
                            lastUpdatedBy: user.userId,
                            name: this.uiElements.inputGroupName.value,
                            reactions: this.list.sortableList.items
                        })
                        GroupsList.list.updateItem(updatedGroup, State.groupIndex)
                    }
                    APIHandlers.updateGroups();
                });
            }
        })
    },

    _initList(options) {
        let groupName = options.name || '';
        this.uiElements.inputGroupName.value = groupName

        this.list = new reactionListUI('#reactionsSortableList');
        this.updateEmptyState("loading");

        this.reactions = options.reactions || [];
        this.list.init(this.reactions);

        if (!this.reactions.length) return this.updateEmptyState("empty");
        else return this.updateEmptyState("list printed");

    },

    _initUIElements() {
        this.uiElements = {
            breadcrumbsSelector: document.getElementById('breadcrumbs'),
            addBtn: document.getElementById("add-reaction-btn"),
            emptyState: document.getElementById('reactionsEmptyState'),
            sortableList: document.getElementById('reactionsSortableList'),
            inputGroupName: document.getElementById('groupName'),
            groupNameError: document.getElementById('group-name-error'),
            cancle: document.getElementById('cancleGroup'),
            save: document.getElementById('saveGroup'),
        }
    },

    _buildBreadCrumbs(pages) {
        this.uiElements.breadcrumbsSelector.innerHTML = "";
        this.uiElements.breadcrumbsSelector.classList.remove('hidden');
        pages.forEach((breadCrumb, index) => {
            const listItem = document.createElement('li');
            if (index < pages.length - 1) {
                listItem.innerHTML = `<a>${breadCrumb}</a>`;

                listItem.onclick = () => {
                    if (!State.warn) {
                        let groups = GroupsList.groups, reactions = [];
                        if (groups && groups[0] && groups[0].reactions) {
                            reactions = groups[0].reactions;
                        }
                        APIHandlers.sendToWidget(false, reactions);

                        return Views.navigate('groupList');
                    }
                    let navigateOptions = {
                        title: `Unsaved Changes`,
                        message: `This page contains unsaved changes. Do you still wish to leave the page?`,
                        confirmButton: { text: "Leave Page", type: "danger" },
                    }

                    buildfire.dialog.confirm(navigateOptions,
                        (e, isConfirmed) => {
                            if (e) console.error(e);
                            if (isConfirmed) {
                                let groups = GroupsList.groups, reactions = [];
                                if (groups && groups[0] && groups[0].reactions) {
                                    reactions = groups[0].reactions;
                                }
                                APIHandlers.sendToWidget(false, reactions);

                                Views.navigate('groupList');
                            }
                        }
                    );
                };
            } else {
                listItem.innerHTML = `<span>${breadCrumb}</span>`;
            }
            this.uiElements.breadcrumbsSelector.appendChild(listItem);
        });
    },

    toggleSaveButton(disabled = false) {
        if (disabled) return this.uiElements.save.setAttribute('disabled', 'disabled');
        let validGroupName = this.uiElements.inputGroupName.value;
        let validReactionsIcons = true;
        if (this.reactions.length) {
            this.reactions.forEach(reaction => {
                if (!reaction.selectedUrl || !reaction.unSelectedUrl) validReactionsIcons = false;
            });
        } else {
            validReactionsIcons = false;
        }

        if (validGroupName && validReactionsIcons) this.uiElements.save.removeAttribute('disabled');
        else this.uiElements.save.setAttribute('disabled', 'disabled');

        if (this.reactions.length === 5) this.uiElements.addBtn.setAttribute('disabled', 'disabled');
        else this.uiElements.addBtn.removeAttribute('disabled');

        APIHandlers.sendToWidget(true, this.reactions);
    },

    updateEmptyState(state) {
        if (state == "loading") {
            this.uiElements.emptyState.innerHTML = `<div class="empty-state"><h4> Loading... </h4></div>`;
            this.uiElements.emptyState.classList.remove('hidden');
            this.uiElements.sortableList.classList.add('hidden');
        } else if (state == "empty") {
            this.uiElements.emptyState.innerHTML = `<div class="empty-state"><h4>You haven't added anything yet</h4></div>`;
            this.uiElements.emptyState.classList.remove('hidden');
            this.uiElements.sortableList.classList.add('hidden');
        } else {
            this.uiElements.emptyState.classList.add('hidden');
            this.uiElements.sortableList.classList.remove('hidden');
        }
    }
}