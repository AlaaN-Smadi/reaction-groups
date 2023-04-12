class SortableListUI {
    constructor(elementId, options = {}) {
        this.container = document.querySelector(elementId);
        this.sortableList = null;
        this.options = options;
    }

    get items() {
        return this.sortableList.items;
    }

    /*
    This method will call the datastore to pull a single object
    it needs to have an array property called `items` each item need {title, imgUrl}
    */
    init(items) {
        this.container.innerHTML = "";
        this.render(items);
    }

    render(items, callback) {
        if (!this.sortableList) {
            this.sortableList = new SortableList(this.container, items || [], this._injectItemElements, this.options);
            this.sortableList.onItemClick = this.onItemClick;
            this.sortableList.onDeleteItem = this.onDeleteItem;
            this.sortableList.onUpdateItem = this.onUpdateItem;
            this.sortableList.onOrderChange = this.onOrderChange;
            this.sortableList.onImageClick = this.onImageClick;
            this.sortableList.onEditBtnClicked = this.onEditBtnClicked;
            this.sortableList.onToggleChanged = this.onToggleChanged;
            this.sortableList.onImageChanged = this.onImageChanged;
            this.sortableList.onSelectedImageChange = this.onSelectedImageChange;
            this.sortableList.onUnSelectedImageChange = this.onUnSelectedImageChange;
        } else {
            this.sortableList.loadItems(items);
        }
        if (callback) callback();
    }

    // append new sortable item to the DOM
    _injectItemElements(item, index, divRow) {
        // function passed by constructor;
    }

    /**
     * Updates item in datastore and updates sortable list UI
     * @param {Object} item Item to be updated
     * @param {Number} index Array index of the item you are updating
     * @param {HTMLElement} divRow Html element (div) of the entire row that is being updated
     * @param {Function} callback Optional callback function
     */

    updateItem(item, index, divRow, callback) {
        this.sortableList.items = this.sortableList.items.map((_item, idx) => {
            if (idx !== index) {
                return _item;
            } else {
                return item
            }
        })
        callback && callback();
        this.onUpdateItem();
    }

    /**
     * This function adds item to datastore and updates sortable list UI
     * @param {Object} item Item to be added to datastore
     * @param {Function} callback Optional callback function
     */

    addItem(item, callback) {
        this.sortableList.append(item);
        callback && callback(item);
        this.onAddItem(item);
    }

    deleteItem(type, divRow, propertyName, propertyValue) {
        let deleteOptions = {
            title: `Delete ${type === 'reactions' ? 'Reaction' : 'Group'}`,
            message: `Are you sure you want to delete ${type === 'reactions' ? 'this reaction' : propertyValue + ' group'}?`,
            confirmButton: { text: "Delete", type: "danger" },
        }
        buildfire.dialog.confirm(deleteOptions, (e, isConfirmed) => {
            if (e) console.error(e);

            if (isConfirmed) {
                if (e) console.error(e);
                if (isConfirmed) {
                    this.sortableList.deleteItem(propertyName, propertyValue, divRow);
                    this.onDeleteItem();
                }
            }
        });
    }

    onItemClick(item, divRow) { }

    onUpdateItem(item, index, divRow) {
        console.log("onUpdateItem");
    }

    onDeleteItem() {

    }

    onOrderChange(item, oldIndex, newIndex) {
        console.log("Order changed");
    }

    onEditBtnClicked(item, index, divRow) {

    }

    onImageClick(item, index, divRow) {

    }

    onToggleChanged(item, isCheck, index) {

    }

    onImageChanged(item, imgSrc, index) {

    }
    onSelectedImageChange(item, imgSrc, index) {

    }
    onUnSelectedImageChange(item, imgSrc, index) {

    }
    onAddItem() { }
}

class groupListUI extends SortableListUI {
    constructor(elementId) {
        super(elementId, { isDraggable: true });
    }

    // append new sortable item to the DOM
    _injectItemElements = (item, index, divRow) => {
        if (!item) throw "Missing Item";
        divRow.innerHTML = "";
        divRow.setAttribute("arrayIndex", index);

        // Create the required DOM elements
        var moveHandle = document.createElement("span"),
            name = document.createElement("a"),
            deleteButton = document.createElement("span"),
            editButton = document.createElement("span");

        // Add the required classes to the elements
        divRow.className = "d-item clearfix";
        moveHandle.className = "icon icon-menu cursor-grab";
        name.className = "title ellipsis item-title";

        deleteButton.className = "btn--icon icon icon-cross2";
        editButton.className = "btn--icon icon icon-pencil";
        name.innerHTML = item.name;

        // Append elements to the DOM
        divRow.appendChild(moveHandle);

        divRow.appendChild(name);
        divRow.appendChild(editButton);
        divRow.appendChild(deleteButton);

        name.onclick = () => {
            let index = divRow.getAttribute("arrayIndex");
            index = parseInt(index);
            this.onEditBtnClicked(item, index, divRow);
            return false;
        };

        editButton.onclick = () => {
            let index = divRow.getAttribute("arrayIndex");
            index = parseInt(index);
            this.onEditBtnClicked(item, index, divRow);
            return false;
        };

        deleteButton.onclick = () => {
            let index = divRow.getAttribute("arrayIndex");
            index = parseInt(index);
            this.deleteItem('groups', divRow, 'name', item.name);
            return false;
        };
    }

    onDeleteItem = () => {
        GroupsList.groups = this.sortableList.items;
        if (GroupsList.groups.length === 0) {
            GroupsList.updateEmptyState("empty");
        }
        APIHandlers.updateGroups();
    }

    onEditBtnClicked = (item, index) => {
        State.groupIndex = index;
        Views.navigate('reactionList', item);
    }

    onOrderChange = () => {
        APIHandlers.updateGroups();
    }

}

class reactionListUI extends SortableListUI {
    constructor(elementId) {
        super(elementId, { isDraggable: true });
    }

    // append new sortable item to the DOM
    _injectItemElements = (item, index, divRow) => {
        if (!item) throw "Missing Item";
        divRow.innerHTML = "";
        divRow.setAttribute("arrayIndex", index);

        // Create the required DOM elements
        let moveHandle = document.createElement("span"),
            unSelectedImage = document.createElement("div"),
            unSelectedTitle = document.createElement("a"),
            selectedImage = document.createElement("div"),
            selectedTitle = document.createElement("a"),
            deleteButton = document.createElement("span"),
            activeState = document.createElement("label"),
            toggleButton = document.createElement("div");

        // Add the required classes to the elements
        divRow.className = "d-item clearfix";
        moveHandle.className = "icon icon-menu cursor-grab";
        selectedTitle.className = "title ellipsis item-title";
        unSelectedTitle.className = "title ellipsis item-title";
        deleteButton.className = "btn--icon icon icon-cross2";
        unSelectedImage.className = "icon-picker margin-left-fifteen cursor-pointer un-selected-image-container";
        selectedImage.className = "icon-picker cursor-pointer selected-image-container";
        activeState.className = "active-state";
        activeState.setAttribute('for', `${item.id}`);

        activeState.innerHTML = item.isActive ? 'Active' : 'Inactive';
        toggleButton.classList.add('button-switch');
        toggleButton.classList.add('margin-zero');
        toggleButton.classList.add('margin-right-fifteen');
        let toggleInput = document.createElement('div');
        toggleInput.innerHTML = `<input id="${item.id}" type="checkbox" />`;
        toggleInput = toggleInput.firstChild;

        toggleInput.checked = item.isActive;
        let toggleLabel = document.createElement('div');
        toggleLabel.innerHTML = `<label for="${item.id}" class="label-success"></label>`;
        toggleLabel = toggleLabel.firstChild;

        toggleInput.onclick = (event) => {
            if (event.target.checked) {
                activeState.innerHTML = 'Active';
            } else {
                activeState.innerHTML = 'Inactive';
            }
            this.sortableList.changeToggle(item, event.target.checked, divRow);
            this.onToggleChanged(item, event.target.checked);
        }

        toggleButton.appendChild(toggleInput);
        toggleButton.appendChild(toggleLabel);

        let croppedSelected = buildfire.imageLib.cropImage(item.selectedUrl,{ size: "half_width", aspect: "1:1" });
        let croppedUnSelected = buildfire.imageLib.cropImage(item.unSelectedUrl,{ size: "half_width", aspect: "1:1" });
        selectedImage.innerHTML = item.selectedUrl ? `<img src="${croppedSelected}" alt="Selected Icon" />` : '<span class="add-icon">+</span>';
        selectedTitle.innerHTML = 'Selected';
        unSelectedImage.innerHTML = item.unSelectedUrl ? `<img src="${croppedUnSelected}" alt="Selected Icon" />` : '<span class="add-icon">+</span>';
        unSelectedTitle.innerHTML = 'Unselected';

        // Append elements to the DOM
        divRow.appendChild(moveHandle);

        divRow.appendChild(unSelectedImage);
        divRow.appendChild(unSelectedTitle);
        divRow.appendChild(selectedImage);
        divRow.appendChild(selectedTitle);
        divRow.appendChild(activeState);
        divRow.appendChild(toggleButton);
        divRow.appendChild(deleteButton);

        deleteButton.onclick = () => {
            let index = divRow.getAttribute("arrayIndex");
            index = parseInt(index);
            this.deleteItem('reactions', divRow, 'id', item.id);
            return false;
        };

        unSelectedImage.addEventListener('click', () => addImage('unSelected'));
        unSelectedTitle.addEventListener('click', () => addImage('unSelected'));
        selectedImage.addEventListener('click', () => addImage('selected'));
        selectedTitle.addEventListener('click', () => addImage('selected'));

        const addImage = (type) => {
            buildfire.imageLib.showDialog({ multiSelection: false, showIcons: false, showFiles: true }, (err, result) => {
                if (err) return console.error(err);
                else {
                    if (result && result.selectedFiles && result.selectedFiles.length > 0) {
                        switch (type) {
                            case 'selected':
                                this.onSelectedImageChange(item, divRow, result.selectedFiles[0]);
                                break;
                            case 'unSelected':
                                this.onUnSelectedImageChange(item, divRow, result.selectedFiles[0])
                                break;
                            default:
                                break;
                        }
                        this.onImageChanged(item, result.selectedFiles[0])
                    }
                }
            });
        }
    }

    onAddItem(item, index, divRow) {
        ReactionsList.reactions = this.sortableList.items;
        ReactionsList.toggleSaveButton();
    }

    onDeleteItem = () => {
        State.warn = true;
        ReactionsList.reactions = this.sortableList.items;

        if (ReactionsList.reactions.length === 0) {
            ReactionsList.updateEmptyState("empty");
        }
        ReactionsList.toggleSaveButton();
    }

    onOrderChange = () => {
        ReactionsList.reactions = this.sortableList.items;
        ReactionsList.toggleSaveButton();
        State.warn = true;
    }

    onToggleChanged = () => {
        ReactionsList.reactions = this.sortableList.items;
        ReactionsList.toggleSaveButton();
        State.warn = true;
    }

    onSelectedImageChange = (item, divRow, src) => {
        let croppedImage = buildfire.imageLib.cropImage(src,{ size: "half_width", aspect: "1:1" });
        let imageContainer = divRow.querySelector('.selected-image-container');
        imageContainer.innerHTML = `<img src="${croppedImage}" alt="UnSelected Icon" />`;

        item.selectedUrl = src;
        this.sortableList.items = this.sortableList.items.map(_item => {
            if (_item.id !== item.id) return _item;
            else {
                return ({
                    ..._item,
                    selectedUrl: src
                })
            }
        })
    }

    onUnSelectedImageChange = (item, divRow, src) => {
        let croppedImage = buildfire.imageLib.cropImage(src,{ size: "half_width", aspect: "1:1" });
        let imageContainer = divRow.querySelector('.un-selected-image-container')
        imageContainer.innerHTML = `<img src="${croppedImage}" alt="UnSelected Icon" />`;

        item.unSelectedUrl = src;
        this.sortableList.items = this.sortableList.items.map(_item => {
            if (_item.id !== item.id) return _item;
            else {
                return ({
                    ..._item,
                    unSelectedUrl: src
                })
            }
        })
    }

    onImageChanged = () => {
        ReactionsList.reactions = this.sortableList.items;
        ReactionsList.toggleSaveButton();
        State.warn = true;
    }

}
