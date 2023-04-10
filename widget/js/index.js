'use strict';

const ReactionsTypes = window["reactionsComponentTestPart"].ReactionsTypes;

function messageHandler() {
    buildfire.messaging.onReceivedMessage = (message) => {
        let { openReactionList, reactions } = message;

        if (reactions && Array.isArray(reactions)) {
            reactions = reactions.filter(reaction => (reaction.isActive));
            ReactionsTypes.types = reactions;

            document.getElementById('main-reactions-container').innerHTML = `<div bf-reactions-itemid="itemId_2" bf-reactions-showCount="true" bf-reactions-showUsersReactions="false"></div>`;
        }

        setTimeout(() => {
            let iconsContainer = document.querySelector('.reactions-icon-container');
            if (openReactionList && reactions.length > 1 && iconsContainer) {
                iconsContainer.classList.remove('reactions-hidden');
            } else if (reactions.length == 0) {
                buildfire.dialog.toast({
                    message: "There is no active reactions in this group, another group will be automatically shown",
                });
            }
        }, 500)
    };
}

function init() {
    messageHandler();
}

init();