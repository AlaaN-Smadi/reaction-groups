class ReactionsGroups {
    /**
     * Get Database Tag
     */
    static get TAG() {
        return "$$reactionsGroups";
    }

    static get(options, callback) {
        if(!callback){
            console.error("callback must be a function");
        }

        buildfire.appData.get(this.TAG, (err, result) => {
            if (err) return callback(err)

            return callback(null, result.data)
        });
    }

    static getByName(groupName, callback) {
        if (!groupName) {
            return callback("Invalid groupName")
        }

        if(!callback){
            console.error("callback must be a function");
        }

        buildfire.appData.get(this.TAG, (err, result) => {
            if (err) return callback(err)

            if (!result.data || !result.data.groups || !result.data.groups.length) {
                return callback(null, null)
            }

            let group = null;
            for (let i = 0; i < result.data.groups.length; i++) {
                if (result.data.groups[i].name.toLowerCase() === groupName.toLowerCase()) {
                    group = result.data.groups[i];
                    break;
                }
            }

            return callback(null, group);
        });
    }

    static insert(reactionsGroup, callback) {
        if (!reactionsGroup || !reactionsGroup.groups) {
            return callback("Invalid reactionsGroup")
        }

        if(!callback){
            console.error("callback must be a function");
        }

        buildfire.appData.save(
            reactionsGroup,
            this.TAG,
            (e, res) => {
                if (e) return callback(e)

                return callback(null, res);
            }
        );
    }

    static update(reactionsGroup, callback) { // modify lastUpdatedBy
        if (!reactionsGroup || !reactionsGroup.groups) {
            return callback("Invalid reactionsGroup")
        }

        if(!callback){
            console.error("callback must be a function");
        }

        buildfire.appData.save(
            reactionsGroup,
            this.TAG,
            (e, res) => {
                if (e) return callback(e)

                return callback(null, res);
            }
        );
    }

    static delete(groupName, callback) {
        if (!groupName) {
            return callback("Invalid groupName")
        }

        if(!callback){
            console.error("callback must be a function");
        }

        buildfire.appData.get(this.TAG, (err, result) => {
            if (err) return callback(err)

            if (!result.data || !result.data.groups || !result.data.groups.length) {
                return callback(null, null)
            }

            let reactionsGroup = result.data;
            reactionsGroup.groups = reactionsGroup.groups.filter(group=>(groupName.toLowerCase()!==group.name.toLowerCase()))

            buildfire.appData.save(
                reactionsGroup,
                this.TAG,
                (e, res) => {
                    if (e) return callback(e)
    
                    return callback(null, res);
                }
            );
        });
    }
}