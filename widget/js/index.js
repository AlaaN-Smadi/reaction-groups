'use strict';

const ComponentReactionsTypes = window["reactionsComponentTestPart"].ReactionsTypes;
const itemId = '2457ffb3-11a1-4e3f-ba46-b1cdaea055c5';

function messageHandler() {
    buildfire.messaging.onReceivedMessage = (message) => {
        let { openReactionList, groupName, groups } = message;
        groupName = groupName ? JSON.parse(groupName).toLowerCase() : '';

        if (groupName) {
            ComponentReactionsTypes.groups = groups;
            ComponentReactionsTypes.itemsReactionsGroupName[itemId] = groupName;

            let stringGroupName;
            if(groupName.length>0){
                stringGroupName = JSON.stringify(groupName)
            }else{
                stringGroupName = ''
            }
            document.getElementById('main-reactions-container').innerHTML = `<div bf-group-name='${stringGroupName}' bf-reactions-itemid=${itemId}></div>`;
        }

        setTimeout(() => {
            let iconsContainer = document.querySelector('.reactions-icon-container');
            ComponentReactionsTypes.getReactionsTypes({ itemId, groupName }, (err, reactions) => {
                if (err) {
                    return console.error(err);
                }
                if (openReactionList && reactions.length > 1 && iconsContainer) {
                    iconsContainer.classList.remove('reactions-hidden');
                }
            });
        }, 500)
    };
}

function init() {
    messageHandler();
}

init();