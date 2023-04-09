class ReactionsGroup {
    constructor(data = {}) {
        this.groups = data.groups || [];
    }
}

class Group{
    constructor(data){
        this.name = data.name || "";
        this.reactions = data.reactions || [];
        this.createdBy = data.createdBy || "";
        this.lastUpdatedBy = data.lastUpdatedBy || "";
    }
}