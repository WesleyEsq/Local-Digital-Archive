export namespace main {
	
	export class Entry {
	    id: number;
	    library_id: number;
	    title: string;
	    description: string;
	    number: string;
	    comment: string;
	    rank: string;
	    textAlignment: string;
	
	    static createFrom(source: any = {}) {
	        return new Entry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.library_id = source["library_id"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.number = source["number"];
	        this.comment = source["comment"];
	        this.rank = source["rank"];
	        this.textAlignment = source["textAlignment"];
	    }
	}
	export class File {
	    id: number;
	    groupset_id: number;
	    filename: string;
	    mime_type: string;
	    file_size: number;
	    sort_order: number;
	
	    static createFrom(source: any = {}) {
	        return new File(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.groupset_id = source["groupset_id"];
	        this.filename = source["filename"];
	        this.mime_type = source["mime_type"];
	        this.file_size = source["file_size"];
	        this.sort_order = source["sort_order"];
	    }
	}
	export class GroupSet {
	    id: number;
	    entry_id: number;
	    title: string;
	    category: string;
	    sort_order: number;
	
	    static createFrom(source: any = {}) {
	        return new GroupSet(source);
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
	export class Library {
	    id: number;
	    name: string;
	    type: string;
	    author: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new Library(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.author = source["author"];
	        this.description = source["description"];
	    }
	}
	export class Tag {
	    id: number;
	    name: string;
	    description: string;
	    icon: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new Tag(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.icon = source["icon"];
	        this.count = source["count"];
	    }
	}

}

