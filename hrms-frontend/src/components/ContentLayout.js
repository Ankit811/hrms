import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../components/ui/card';

function ContentLayout({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sm:ml-0 md:ml-[240px] sm:p-2 md:p-4 bg-gray-50 min-h-[calc(100vh-64px)] mt-16 flex flex-col items-center w-full transition-margin-left duration-300"
    >
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-3xl font-bold text-blue-800 mb-6 text-center"
      >
        {title}
      </motion.h1>
      <Card className="w-full max-w-[1200px] bg-white shadow-lg border-none">
        <CardContent className="p-6 flex justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-full flex justify-center"
          >
            {children}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ContentLayout;