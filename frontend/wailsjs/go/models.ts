export namespace main {
	
	export class CompendiumData {
	    title: string;
	    author: string;
	    description: string;
	    image: number[];
	
	    static createFrom(source: any = {}) {
	        return new CompendiumData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.author = source["author"];
	        this.description = source["description"];
	        this.image = source["image"];
	    }
	}
	export class MangaEntry {
	    id: number;
	    number: string;
	    title: string;
	    comment: string;
	    rank: string;
	    image: number[];
	    description: string;
	    backup: number[];
	    backupName: string;
	    textAlignment: string;
	
	    static createFrom(source: any = {}) {
	        return new MangaEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.number = source["number"];
	        this.title = source["title"];
	        this.comment = source["comment"];
	        this.rank = source["rank"];
	        this.image = source["image"];
	        this.description = source["description"];
	        this.backup = source["backup"];
	        this.backupName = source["backupName"];
	        this.textAlignment = source["textAlignment"];
	    }
	}
	export class MediaAsset {
	    id: number;
	    group_id: number;
	    title: string;
	    filename: string;
	    mime_type: string;
	    file_size: number;
	    sort_order: number;
	
	    static createFrom(source: any = {}) {
	        return new MediaAsset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.group_id = source["group_id"];
	        this.title = source["title"];
	        this.filename = source["filename"];
	        this.mime_type = source["mime_type"];
	        this.file_size = source["file_size"];
	        this.sort_order = source["sort_order"];
	    }
	}
	export class MediaGroup {
	    id: number;
	    entry_id: number;
	    title: string;
	    category: string;
	    sort_order: number;
	
	    static createFrom(source: any = {}) {
	        return new MediaGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.entry_id = source["entry_id"];
	        this.title = source["title"];
	        this.category = source["category"];
	        this.sort_order = source["sort_order"];
	    }
	}

}

