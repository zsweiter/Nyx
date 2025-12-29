interface InputFieldProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	label: string;
	type?: string;
	name: string;
}

export const InputField = ({ value, onChange, placeholder, label, type = 'text', name }: InputFieldProps) => {
	return (
		<div>
			<label htmlFor={name} className="sr-only">
				{label}
			</label>
			<input
				name={name}
				value={value}
				type={type}
				onChange={(e) => onChange(e.target.value)}
				className="appearance-none rounded-md relative block w-full px-4 py-3 border border-solid border-neutral-700 bg-neutral-900 placeholder-neutral-500 text-white rounded-b-md focus:outline-none focus:ring-amber-400 focus:border-amber-400 focus:z-10 sm:text-sm"
				placeholder={placeholder}
			/>
		</div>
	);
};
