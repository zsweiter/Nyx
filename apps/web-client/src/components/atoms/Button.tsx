interface ButtonProps {
	loading?: boolean;
	children: React.ReactNode;
	[key: string]: any;
}

export const Button = ({ loading, children, ...props }: ButtonProps) => (
	<button
		disabled={loading}
		{...props}
		className={
			'group cursor-pointer relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-800 hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ' +
			(loading ? ' opacity-60 cursor-not-allowed' : '') +
			(props.className ? ' ' + props.className : '')
		}
	>
		{loading ? (
			<span className="flex items-center gap-2">
				<svg
					className="animate-spin h-5 w-5 text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
					></circle>
					<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
				</svg>
				Loading...
			</span>
		) : (
			children
		)}
	</button>
);
