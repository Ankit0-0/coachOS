import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View, Pressable, TextInput, Alert, Text } from 'react-native';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { useAuth } from '@/contexts/auth';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email.trim().toLowerCase(), password, name.trim());
      // The root layout watches isSignedIn and redirects to the app tabs.
    } catch (error) {
      Alert.alert('Sign up failed', errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.appBadge}>Coach OS · Client App</Text>
        <Text style={styles.title}>Sign Up</Text>
        <Text style={styles.subtitle}>Create your Coach OS account</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          editable={!isLoading}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 8 characters"
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
          secureTextEntry={true}
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!isLoading}
          secureTextEntry={true}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, { opacity: isLoading ? 0.6 : 1 }]}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <GoogleSignInButton />

        <View style={styles.signInPrompt}>
          <Text>Already have an account? </Text>
          <Pressable onPress={() => router.push('/auth/signin')}>
            <Text style={styles.link}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    color: '#0F8B8D',
    fontWeight: '600',
  },
  header: {
    gap: 8,
  },
  appBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F8B8D',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    color: '#60646C',
  },
  formContainer: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderColor: '#E6E6EB',
    backgroundColor: '#F0F0F3',
  },
  buttonContainer: {
    gap: 16,
    paddingBottom: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E6E6EB',
  },
  dividerText: {
    fontSize: 13,
    color: '#60646C',
  },
  button: {
    backgroundColor: '#0F8B8D',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signInPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  link: {
    color: '#0F8B8D',
    fontWeight: '600',
  },
});
