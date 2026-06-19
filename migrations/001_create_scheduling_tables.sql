-- SocialCore Scheduling Engine: Database Schema
-- Run this against your Supabase PostgreSQL database

-- 1. WORKSPACES: Multi-tenant organizational containers
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(10) DEFAULT '🚀',
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. WORKSPACE MEMBERS: Links users to workspaces with roles
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'contributor', 'client')) DEFAULT 'contributor',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- 3. CONNECTED CHANNELS: OAuth tokens for social platforms
CREATE TABLE IF NOT EXISTS connected_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    platform_user_id VARCHAR(255) NOT NULL,
    profile_name VARCHAR(255),
    profile_image_url TEXT,
    page_id VARCHAR(255),
    org_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SCHEDULED POSTS: Content calendar entries
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    platforms TEXT[] NOT NULL,
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'approved', 'scheduled', 'publishing', 'published', 'failed')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. POST ATTACHMENTS: Media files linked to posts
CREATE TABLE IF NOT EXISTS post_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    size VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. POST COMMENTS: Collaboration comments
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
    author_id VARCHAR(100) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(100),
    author_avatar_url TEXT,
    is_ai BOOLEAN DEFAULT false,
    persona VARCHAR(50),
    text TEXT NOT NULL,
    suggestions TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. POST LOGS: Activity audit trail
CREATE TABLE IF NOT EXISTS post_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_workspace ON scheduled_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON scheduled_posts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON connected_channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_attachments_post ON post_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_logs_post ON post_logs(post_id);

-- Row Level Security (enable in Supabase Dashboard or via SQL)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workspace member access
CREATE POLICY workspace_member_access ON workspaces
    FOR ALL USING (
        id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY workspace_members_policy ON workspace_members
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY channel_workspace_access ON connected_channels
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY post_workspace_access ON scheduled_posts
    FOR ALL USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY attachment_workspace_access ON post_attachments
    FOR ALL USING (
        post_id IN (
            SELECT id FROM scheduled_posts
            WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        )
    );

CREATE POLICY comment_workspace_access ON post_comments
    FOR ALL USING (
        post_id IN (
            SELECT id FROM scheduled_posts
            WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        )
    );

CREATE POLICY log_workspace_access ON post_logs
    FOR ALL USING (
        post_id IN (
            SELECT id FROM scheduled_posts
            WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        )
    );
