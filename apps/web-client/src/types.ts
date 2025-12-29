export enum MessageType {
	Text = 'text',
	Image = 'image',
	Sticker = 'sticker',
	Template = 'template',
	Audio = 'audio',
	Video = 'video',
	Interactive = 'interactive',
	Document = 'document',
	RequestWelcome = 'request_welcome',
	Contacts = 'contacts',
	Location = 'location',
}

export interface TextPayload {
	body: string;
}

interface BaseMediaPayload {
	id: string;
	caption?: string;
	mime_type?: string;

	// buffer use for preview media
	buffer?: Buffer | Uint8Array | string | File | Blob;
}
export interface ImagePayload extends BaseMediaPayload {}

export interface AudioPayload extends BaseMediaPayload {
	duration?: number;
}

export interface VideoPayload extends BaseMediaPayload {
	duration?: number;
}

export interface StickerPayload extends BaseMediaPayload {}

interface TemplateButton {
	type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'OTP_CODE';
	text: string;
	url?: string;
	phone_number?: string;
	otp_code?: string;
}

export interface TemplateContent {
	name: string;
	components?: {
		type: string;
		parameters: {
			type: string;
			text: string;
		}[];
	}[];
}

export interface TemplatePayload {
	template_id: string;
	language: string;
	components?: {
		body?: string;
		buttons?: TemplateButton[];
		header?: string;
		footer?: string;
	};
}

export interface InteractivePayload {
	type: 'button'; // o "list"
	body: string;
	buttons: {
		id: string;
		title: string;
	}[];
}

export interface DocumentPayload extends BaseMediaPayload {
	filename: string;
}

export interface ContactPhone {
	phone: string;
	type?: string;
	wa_id?: string;
}

export interface ContactEmail {
	email: string;
	type?: string;
}

export interface ContactAddress {
	street?: string;
	city?: string;
	state?: string;
	zip?: string;
	country?: string;
	country_code?: string;
	type?: string;
}

export interface ContactName {
	formatted_name: string;
	first_name?: string;
	last_name?: string;
	middle_name?: string;
	suffix?: string;
	prefix?: string;
}

export interface ContactInfo {
	name: ContactName;
	phones?: ContactPhone[];
	emails?: ContactEmail[];
	addresses?: ContactAddress[];
	org?: {
		company?: string;
		department?: string;
		title?: string;
	};
	urls?: { url: string; type?: string }[];
	birthday?: string;
}

export interface ContactsPayload {
	contacts: ContactInfo[];
}

export interface LocationPayload {
	latitude: number;
	longitude: number;
	name?: string;
	address?: string;
}

export type MessagePayload =
	| { type: MessageType.Text; payload: TextPayload }
	| { type: MessageType.Image; payload: ImagePayload }
	| { type: MessageType.Sticker; payload: StickerPayload }
	| { type: MessageType.Template; payload: TemplatePayload }
	| { type: MessageType.Audio; payload: AudioPayload }
	| { type: MessageType.Video; payload: VideoPayload }
	| { type: MessageType.Interactive; payload: InteractivePayload }
	| { type: MessageType.RequestWelcome; payload: {} }
	| { type: MessageType.Document; payload: DocumentPayload }
	| { type: MessageType.Contacts; payload: ContactsPayload }
	| { type: MessageType.Location; payload: LocationPayload };

export interface IncomingMessage {
	_id: string;
	username: string;
	user_id: string;
	from: string; // sender id
	recipient_id: string; // recipient id
	message: {
		id: string;
		timestamp: string; // is unix timestamp in seconds
	} & MessagePayload;
	context?: Record<string, any>;
}

export interface OutgoingMessage {
	_id: string;
	user_id: string;
	message: {
		id: string;
		timestamp: string;
	} & MessagePayload;
}
