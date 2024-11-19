import { StyleSheet } from 'react-native';

export const extraCommonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#14171A',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#657786',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#5271ff',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
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
  input: {
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 25,
    height: 50,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#14171A',
    marginBottom: 15,
  },
  optionButton: {
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedOptionButton: {
    backgroundColor: '#5271ff',
    borderColor: '#5271ff',
  },
  optionText: {
    fontSize: 16,
    color: '#14171A',
    marginLeft: 10,
  },
  selectedOptionText: {
    color: '#fff',
  },
}); 