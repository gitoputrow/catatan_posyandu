export type User = {
    id?:             string;
    auth_user_id?:   string;
    posyandu_id?:    string;
    kelurahan_id?:   string;
    nama?:           string;
    no_hp?:          string;
    jenis_petugas?:  string;
    role?:            string;
    is_active?:      boolean;
    created_at?:     Date;
    updated_at?:     Date;
    email?:          string;
    nama_kelurahan?: string;
    nama_posyandu?:  string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toUser(json: string): User {
        return JSON.parse(json);
    }

    public static userToJson(value: User): string {
        return JSON.stringify(value);
    }
}
