import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#14171A',
    marginTop: 20,
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#657786',
    marginBottom: 30,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 15,
    color: '#14171A',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#5271ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    marginTop: 'auto',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#AAB8C2',
  },
  errorText: {
    color: '#E0245E',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 15,
  },
  logo: {
    width: width * 0.3,
    height: width * 0.3,
    resizeMode: 'contain',
    marginBottom: 30,
  },
});
