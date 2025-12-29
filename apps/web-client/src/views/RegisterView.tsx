import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../store/slices/user.slice';
import { useAppDispatch } from '../store/hooks';
import { BsPersonPlusFill } from 'react-icons/bs';

const Register = () => {
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [avatar, setAvatar] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const navigate = useNavigate();
	const dispatch = useAppDispatch();

	useEffect(() => {
		const token = localStorage.getItem('auth-token');
		if (token) {
			navigate('/chat');
		}
	}, [navigate]);

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setAvatar(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleRegister = async (e: FormEvent) => {
		e.preventDefault();

		const formData = new FormData();
		formData.append('username', username);
		formData.append('email', email);
		formData.append('password', password);
		if (avatar) {
			formData.append('avatar', avatar);
		}

		try {
			await dispatch(register(formData)).unwrap();
			navigate('/chat');
		} catch (error) {
			console.log(error);
		}
	};

	return (
		<div className="min-h-screen ml-auto flex items-center justify-center bg-supabase-darker py-12 px-14 w-lg">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-2xl font-extrabold text-white">Create a new account</h2>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleRegister}>
					<div className="flex flex-col items-center mb-4">
						<label className="cursor-pointer relative group">
							<div className="w-24 h-24 rounded-full bg-supabase-dark border-2 border-gray-700 flex items-center justify-center overflow-hidden hover:border-supabase-green transition-colors">
								{preview ? (
									<img src={preview} alt="Avatar preview" className="w-full h-full object-cover" />
								) : (
									<BsPersonPlusFill className="text-gray-500 text-4xl group-hover:text-supabase-green transition-colors" />
								)}
							</div>
							<input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
							<span className="text-xs text-gray-500 mt-2 block text-center">Subir Avatar</span>
						</label>
					</div>

					<div className="rounded-md shadow-sm -space-y-px">
						<div className="pb-4">
							<label htmlFor="username" className="sr-only">
								Username
							</label>
							<input
								id="username"
								name="username"
								type="text"
								required
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-supabase-dark placeholder-gray-500 text-white rounded-t-md focus:outline-none focus:ring-supabase-green focus:border-supabase-green focus:z-10 sm:text-sm"
								placeholder="Nombre de usuario"
							/>
						</div>
						<div className="pb-4">
							<label htmlFor="email-address" className="sr-only">
								Email address
							</label>
							<input
								id="email-address"
								name="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-supabase-dark placeholder-gray-500 text-white focus:outline-none focus:ring-supabase-green focus:border-supabase-green focus:z-10 sm:text-sm"
								placeholder="Email address"
							/>
						</div>
						<div>
							<label htmlFor="password" className="sr-only">
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="new-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-supabase-dark placeholder-gray-500 text-white rounded-b-md focus:outline-none focus:ring-supabase-green focus:border-supabase-green focus:z-10 sm:text-sm"
								placeholder="Password"
							/>
						</div>
					</div>

					<div className="flex items-center justify-end">
						<div className="text-sm">
							<Link to="/auth/login" className="font-medium text-supabase-green hover:text-green-400">
								¿Have an account? Log in
							</Link>
						</div>
					</div>

					<div>
						<button
							type="submit"
							className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-supabase-green hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-supabase-green"
						>
							Register
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Register;
