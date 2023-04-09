class ReactionsTypes {
    constructor(data = {}) {
        this.id = data.id || ""; // UUID
        this.selectedUrl = data.selectedUrl || "";
        this.unSelectedUrl = data.unSelectedUrl || "";
        this.isActive = typeof data.isActive !== "undefined" ? data.isActive : true;
    }
}