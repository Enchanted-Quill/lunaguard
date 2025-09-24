import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const Home = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lunaguard</Text>
      <Text style={{ marginTop: 10, marginBottom: 30 }}>Safety that never sleeps</Text>

        <View>
            <Text style={styles.card}>This is a card.</Text>
        </View>

    </View>
  )
}

export default Home

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontWeight: 'bold',
        fontSize: 30,
    },
    card: {
        backgroundColor: '#dbdbdbff',
        borderRadius: 10,
        padding: 20,
        boxShadow: '0 4px 4px rgba(0, 0, 0, 0.1)',
    }
})