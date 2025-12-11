export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            profiles: {
                Row: {
                    avatar_url: string | null
                    bio: string | null
                    created_at: string | null
                    email: string
                    full_name: string | null
                    id: string
                    tags: string[] | null
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string | null
                    email: string
                    full_name?: string | null
                    id: string
                    tags?: string[] | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    bio?: string | null
                    created_at?: string | null
                    email?: string
                    full_name?: string | null
                    id?: string
                    tags?: string[] | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            project_invites: {
                Row: {
                    created_at: string | null
                    email: string
                    id: string
                    project_id: string
                    status: string | null
                }
                Insert: {
                    created_at?: string | null
                    email: string
                    id?: string
                    project_id: string
                    status?: string | null
                }
                Update: {
                    created_at?: string | null
                    email?: string
                    id?: string
                    project_id?: string
                    status?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "project_invites_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    }
                ]
            }
            project_members: {
                Row: {
                    id: string
                    joined_at: string
                    project_id: string
                    role_id: string | null
                    user_id: string
                }
                Insert: {
                    id?: string
                    joined_at?: string
                    project_id: string
                    role_id?: string | null
                    user_id: string
                }
                Update: {
                    id?: string
                    joined_at?: string
                    project_id?: string
                    role_id?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "project_members_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "project_members_role_id_fkey"
                        columns: ["role_id"]
                        isOneToOne: false
                        referencedRelation: "roles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "project_members_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            projects: {
                Row: {
                    created_at: string
                    description: string | null
                    id: string
                    name: string
                    owner_id: string
                }
                Insert: {
                    created_at?: string
                    description?: string | null
                    id?: string
                    name: string
                    owner_id: string
                }
                Update: {
                    created_at?: string
                    description?: string | null
                    id?: string
                    name?: string
                    owner_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "projects_owner_id_fkey"
                        columns: ["owner_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            roles: {
                Row: {
                    created_at: string
                    id: string
                    level: number
                    name: string
                    permissions: Json
                    project_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    level?: number
                    name: string
                    permissions?: Json
                    project_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    level?: number
                    name?: string
                    permissions?: Json
                    project_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "roles_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    }
                ]
            }
            task_categories: {
                Row: {
                    color: string | null
                    created_at: string
                    id: string
                    is_approval_required: boolean
                    name: string
                    position: number
                    project_id: string
                }
                Insert: {
                    color?: string | null
                    created_at?: string
                    id?: string
                    is_approval_required?: boolean
                    name: string
                    position?: number
                    project_id: string
                }
                Update: {
                    color?: string | null
                    created_at?: string
                    id?: string
                    is_approval_required?: boolean
                    name?: string
                    position?: number
                    project_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "task_categories_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    }
                ]
            }
            tasks: {
                Row: {
                    approval_status: string
                    approved_by: string | null
                    assignee_id: string | null
                    category_id: string | null
                    completed: boolean
                    created_at: string
                    deadline: string | null
                    id: string
                    priority: string
                    project_id: string | null
                    title: string
                    user_id: string | null
                }
                Insert: {
                    approval_status?: string
                    approved_by?: string | null
                    assignee_id?: string | null
                    category_id?: string | null
                    completed?: boolean
                    created_at?: string
                    deadline?: string | null
                    id?: string
                    priority?: string
                    project_id?: string | null
                    title: string
                    user_id?: string | null
                }
                Update: {
                    approval_status?: string
                    approved_by?: string | null
                    assignee_id?: string | null
                    category_id?: string | null
                    completed?: boolean
                    created_at?: string
                    deadline?: string | null
                    id?: string
                    priority?: string
                    project_id?: string | null
                    title?: string
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "tasks_approved_by_fkey"
                        columns: ["approved_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "tasks_assignee_id_fkey"
                        columns: ["assignee_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "tasks_category_id_fkey"
                        columns: ["category_id"]
                        isOneToOne: false
                        referencedRelation: "task_categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "tasks_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "tasks_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Helper types removed to simplify and fix lint errors.

