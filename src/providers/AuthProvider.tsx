import {supabase} from '../lib/supabase'
import React ,  {useEffect,PropsWithChildren , createContext, useState, useContext } from 'react'
import { Session, User } from '@supabase/supabase-js'

type AuthContext = {
    session: Session | null;
    user: User | null;
    profile: any | null; // Adjust the type as per your profile structure
}
const AuthContext = createContext<AuthContext >({
    session: null,
    user:null,
    profile:null
})
const AuthProvider = ({children}:PropsWithChildren) => {

    const [session, setSession] = useState<Session | null>(null)  
    const [profile , setProfile] = useState(null)
    useEffect(() => {  
          supabase.auth.getSession().then(({ data: { session } }) =>
             {      setSession(session)    })   
           supabase.auth.onAuthStateChange((_event, session) => {      
            setSession(session)    })  }, [])

    useEffect(()=>{
      if(!session?.user){
        setProfile(null);
        return
      }

      const fetchProfile = async () => {
       try{
         const { data, error } = await supabase
           .from('profiles')
           .select('*')
           .eq('id', session.user.id)
           .single();

         if(data){
           setProfile(data);
         }
       }
       catch (error) {
         console.error('Error fetching profile:', error);
       }
      
      };

      fetchProfile();
    }, [session?.user]);

    console.log(profile);

  return (
    <AuthContext.Provider value={{ session , user: session?.user , profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider


export const useAuth = () => useContext(AuthContext);