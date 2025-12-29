import { FormEvent, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authenticate, join } from '../store/slices/user.slice';
import { useAppDispatch } from '../store/hooks';
import { Button } from '@/components/atoms/Button';
import { InputField } from '@/components/atoms/InputField';

const Login = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [code, setCode] = useState('');
	const [loadingLogin, setLoadingLogin] = useState(false);
	const [loadingJoin, setLoadingJoin] = useState(false);
	const navigate = useNavigate();
	const dispatch = useAppDispatch();

	useEffect(() => {
		const token = localStorage.getItem('auth-token');
		if (token) {
			navigate('/chat');
		}
	}, [navigate]);

	const handleLogin = async (e: FormEvent) => {
		e.preventDefault();
		setLoadingLogin(true);
		try {
			await dispatch(authenticate({ email, password })).unwrap();
			navigate('/chat');
		} catch (error) {
			console.log(error);
		} finally {
			setLoadingLogin(false);
		}
	};

	const handleJoin = async (e: FormEvent) => {
		e.preventDefault();
		setLoadingJoin(true);
		try {
			await dispatch(join({ code })).unwrap();
			navigate('/chat');
		} catch (error) {
			console.log(error);
		} finally {
			setLoadingJoin(false);
		}
	};

	return (
		<div className="min-h-screen ml-auto flex items-center justify-center bg-neutral-950 py-12 px-14 w-lg">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="my-6 text-center text-2xl text-white">Sign In</h2>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleLogin}>
					<input type="hidden" name="remember" defaultValue="true" />
					<div className="flex flex-col w-full gap-4">
						<InputField
							value={email}
							onChange={setEmail}
							placeholder="Email address"
							label="Email address"
							type="email"
							name="email"
						/>
						<InputField
							value={password}
							onChange={setPassword}
							placeholder="Password"
							label="Password"
							type="password"
							name="password"
						/>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center">
							<input
								id="remember-me"
								name="remember-me"
								type="checkbox"
								className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-neutral-700 rounded bg-supabase-dark"
							/>
							<label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-300">
								Remember me
							</label>
						</div>

						<div className="text-sm">
							<a href="#" className="font-medium text-teal-900 hover:text-teal-400">
								Wrong password?
							</a>
						</div>
					</div>

					<div>
						<Button type="submit" loading={loadingLogin}>
							Log In
						</Button>
						<div className="pt-2 w-full text-sm text-center">
							<Link to="/auth/register" className="font-medium text-teal-900 hover:text-teal-400">
								Don't have an account? Register
							</Link>
						</div>
					</div>
				</form>
				<form onSubmit={handleJoin}>
					<h3 className="my-6 text-center text-2xl text-white">Join</h3>
					<InputField
						value={code}
						onChange={setCode}
						placeholder="Code or empty"
						label="Code or empty"
						name="code"
					/>
					<div className="mt-6">
						<Button type="submit" loading={loadingJoin}>
							Join
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Login;
