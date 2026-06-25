export interface SocialPost {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  status: 'draft' | 'pending' | 'approved' | 'scheduled' | 'published' | 'publishing' | 'failed';
  scheduledAt: string; // ISO date-time string
  attachments: PostAttachment[];
  comments: PostComment[];
  logs: ActivityLog[];
  tags: string[];
}

export interface PostAttachment {
  id: string;
  name: string;
  type: string;
  url: string; // Data URL or external link
  size?: string;
}

export interface PostComment {
  id: string;
  author: {
    id: string;
    name: string;
    role: string;
    avatarUrl: string;
    isAI?: boolean;
    persona?: 'jane' | 'lucas' | 'elena' | 'dave';
  };
  text: string;
  createdAt: string;
  suggestions?: string[]; // Optional suggestions from AI reviewer
}

export interface ActivityLog {
  id: string;
  user: {
    name: string;
    role: string;
  };
  action: string; // e.g. "Draft created", "Status updated to scheduled", etc.
  timestamp: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'Admin' | 'Manager' | 'Contributor' | 'Client';
  avatarUrl: string;
  email: string;
  status: 'active' | 'offline';
}

export type ActiveView = 'calendar' | 'feed' | 'grid' | 'list';
