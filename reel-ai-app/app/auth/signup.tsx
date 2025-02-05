import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { AuthService, DatabaseService } from '../services/appwrite';
import { Models } from 'react-native-appwrite';

export default function SignupScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [user, setUser] = React.useState<Models.User<Models.Preferences> | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    setError('');
    
    // Basic validation
    if (!email || !password || !name) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // Create the account first
      const account = await AuthService.createAccount(email, password, name);
      
      // Then create a session
      await AuthService.login(email, password);
      
      // Get the user details
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      // Create user profile
      if (currentUser) {
        await DatabaseService.createProfile(currentUser.$id, name);
      }
      
      // Navigate to home
      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error('Signup error:', err);
      // Check for specific error about existing user
      if (err?.message?.includes('already exists')) {
        setError('An account with this email already exists. Please try logging in instead.');
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Join Reel Recipes</Text>
        <Text style={styles.subtitle}>Create an account to start your culinary journey!</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <TouchableOpacity 
          style={styles.signupButton} 
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  headerContainer: {
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  formContainer: {
    flex: 1,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    color: '#fff',
  },
  errorText: {
    color: '#ff4444',
    marginBottom: 15,
  },
  signupButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#888',
  },
  loginLink: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
}); 